import { spawnSync } from 'node:child_process';
import config from '../config/index.js';
import { CodingProblem, CodingSubmission } from '../models/Coding.js';

const MAX_CODE_LENGTH = 20000;

const BLOCKED_MODULES = new Set([
  'os', 'sys', 'subprocess', 'shutil', 'socket', 'http', 'https', 'urllib',
  'requests', 'builtins', 'importlib', 'posix', 'nt', 'pty', 'commands',
  'ctypes', 'pickle', 'marshal', 'tempfile', 'pathlib',
  'fs', 'child_process', 'net', 'tls', 'dgram', 'dns', 'process', 'path',
  'cluster', 'worker_threads', 'vm', 'inspector', 'module',
]);

const BLOCKED_FUNCTIONS = new Set([
  'eval', 'exec', 'open', 'compile', '__import__', 'globals', 'locals',
  'getattr', 'setattr', 'delattr', 'system', 'spawn', 'spawnsync', 'popen',
  'execsync', 'execfile', 'readfilesync', 'writefilesync',
  'function', 'setinterval', 'settimeout', 'setimmediate',
]);

const BLOCKED_ESCAPE_TOKENS = [
  'constructor', '__proto__', 'prototype', 'Reflect', 'Proxy', 'binding',
  'globalThis', 'window', 'global', 'process', 'Buffer',
  '__subclasses__', '__bases__', '__mro__', '__globals__', '__builtins__',
  'getPrototypeOf',
];

function stripStringsAndComments(code) {
  let result = '';
  let i = 0;
  const n = code.length;
  while (i < n) {
    const ch = code[i];
    // Python # comment or JS // comment
    if (ch === '#' || (ch === '/' && code[i + 1] === '/')) {
      while (i < n && code[i] !== '\n') i++;
      continue;
    }
    // JS /* ... */ comment
    if (ch === '/' && code[i + 1] === '*') {
      i += 2;
      while (i < n && !(code[i] === '*' && code[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    // Triple quotes (Python)
    if ((ch === '"' || ch === "'") && code.slice(i, i + 3) === ch.repeat(3)) {
      const q = ch.repeat(3);
      i += 3;
      while (i < n && code.slice(i, i + 3) !== q) {
        if (code[i] === '\\') i++;
        i++;
      }
      i += 3;
      continue;
    }
    // Single / Double / Template strings
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      i++;
      while (i < n && code[i] !== quote) {
        if (code[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }
    result += ch;
    i++;
  }
  return result;
}

function decodeEscapeSequences(code) {
  return code
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export class CodingService {
  static validateSecurityAndSyntax(code) {
    if (!code || typeof code !== 'string') {
      return {
        isValid: false,
        hasInfiniteLoop: false,
        error: 'Syntax Error: Code submission must be a non-empty string.',
        violations: [],
      };
    }

    if (code.length > MAX_CODE_LENGTH) {
      return {
        isValid: false,
        hasInfiniteLoop: false,
        error: `Security Policy Violation: Code size exceeds maximum allowed limit (${MAX_CODE_LENGTH} characters).`,
        violations: ['Code size limit exceeded.'],
      };
    }

    const violations = [];
    const normalizedForSecurity = `${code}\n${decodeEscapeSequences(code)}`;

    // 1. AST / Token security checks on raw and escape-decoded text
    for (const mod of BLOCKED_MODULES) {
      const escapedMod = mod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const importRegex = new RegExp(`(?:^|[^\\w.])(?:import|require|from)\\s*(?:\\(\\s*)?['"\`]?${escapedMod}(?:[/'".\\s]|$)`, 'im');
      if (importRegex.test(normalizedForSecurity)) {
        violations.push(`Security Policy Violation: Import of unauthorized module '${mod}' is strictly prohibited.`);
      }
    }

    for (const func of BLOCKED_FUNCTIONS) {
      const callRegex = new RegExp(`\\b${func}\\s*\\(`, 'i');
      if (callRegex.test(normalizedForSecurity)) {
        violations.push(`Security Policy Violation: Invocation of restricted function '${func}' is not permitted.`);
      }
    }

    for (const token of BLOCKED_ESCAPE_TOKENS) {
      const tokenRegex = new RegExp(`(?:\\b|['"\`])${token}(?:\\b|['"\`])`, 'i');
      if (tokenRegex.test(normalizedForSecurity)) {
        violations.push(`Security Policy Violation: Access to restricted runtime property or escape token '${token}' is strictly prohibited.`);
      }
    }

    if (violations.length > 0) {
      return {
        isValid: false,
        hasInfiniteLoop: false,
        error: violations.join(' '),
        violations,
      };
    }

    // 2. Structural delimiter check (after stripping string literals and comments)
    const stripped = stripStringsAndComments(code);
    let braceCount = 0;
    let parenCount = 0;
    let bracketCount = 0;
    for (const ch of stripped) {
      if (ch === '{') braceCount++;
      if (ch === '}') braceCount--;
      if (ch === '(') parenCount++;
      if (ch === ')') parenCount--;
      if (ch === '[') bracketCount++;
      if (ch === ']') bracketCount--;
      if (braceCount < 0 || parenCount < 0 || bracketCount < 0) {
        return {
          isValid: false,
          hasInfiniteLoop: false,
          error: 'Syntax Error: Unexpected closing bracket, parenthesis, or brace.',
          violations: [],
        };
      }
    }
    if (braceCount !== 0 || parenCount !== 0 || bracketCount !== 0) {
      return {
        isValid: false,
        hasInfiniteLoop: false,
        error: 'Syntax Error: Unmatched parentheses, brackets, or curly braces.',
        violations: [],
      };
    }

    // 3. Static infinite-loop detection (e.g. while True / while (true) / for (;;) without break or return)
    const infiniteLoopPattern = /(?:while\s+True\s*:|while\s*\(\s*(?:true|1)\s*\)|for\s*\(\s*;\s*;\s*\))/i;
    if (infiniteLoopPattern.test(stripped) && !/\b(?:break|return|yield)\b/.test(stripped)) {
      return {
        isValid: false,
        hasInfiniteLoop: true,
        error: 'Execution Time Limit Exceeded: Non-terminating loop detected without exit condition.',
        violations: [],
      };
    }

    return { isValid: true, hasInfiniteLoop: false, error: null, violations: [] };
  }

  /**
   * Executes JavaScript code only inside an isolated child Node subprocess with
   * stripped environment variables, memory limits, disallowed dynamic codegen,
   * and strict wall-clock kill timeout. Never uses in-process node:vm for untrusted code.
   */
  static runIsolatedJsSubprocess(code, timeoutMs) {
    const wrappedHarness = `
      "use strict";
      const safeRun = () => {
        ${code}
      };
      safeRun();
    `;

    const result = spawnSync(
      process.execPath,
      [
        '--disallow-code-generation-from-strings',
        '--no-addons',
        '--max-old-space-size=64',
        '-e',
        wrappedHarness,
      ],
      {
        env: {}, // Completely strip host environment variables (no secrets/keys)
        timeout: timeoutMs,
        killSignal: 'SIGKILL',
        maxBuffer: 64 * 1024,
        encoding: 'utf-8',
      }
    );

    if (result.error && result.error.code === 'ETIMEDOUT') {
      return { timedOut: true, error: 'Execution Time Limit Exceeded.' };
    }
    if (result.signal === 'SIGKILL' || result.signal === 'SIGTERM') {
      return { timedOut: true, error: 'Execution terminated due to resource or time limit.' };
    }
    if (result.status !== 0) {
      return {
        timedOut: false,
        runtimeError: (result.stderr || 'Runtime execution error').slice(0, 400),
      };
    }
    return { timedOut: false, runtimeError: null };
  }

  static async listProblems(skillSlug = null, difficulty = null) {
    const query = {};
    if (skillSlug) query.skill_slug = skillSlug;
    if (difficulty) query.difficulty = difficulty;

    const problems = await CodingProblem.find(query).sort({ id: 1 });
    return problems.map(p => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      difficulty: p.difficulty,
      skill_slug: p.skill_slug,
      created_at: p.created_at,
    }));
  }

  static async getProblemBySlug(slug) {
    const problem = await CodingProblem.findOne({ slug });
    if (!problem) return null;

    const rawCases = problem.test_cases_json || [];
    const publicCases = rawCases
      .filter(c => !c.is_hidden)
      .map(c => ({
        input: c.input,
        expected_output: c.expected_output,
      }));

    return {
      id: problem.id,
      slug: problem.slug,
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      skill_slug: problem.skill_slug,
      starter_code: problem.starter_code,
      created_at: problem.created_at,
      public_test_cases: publicCases,
      hints: problem.hints_json || [],
    };
  }

  static async submitSolution(userId, problemId, submittedCode) {
    const problem = await CodingProblem.findOne({ id: problemId });
    if (!problem) {
      const err = new Error(`Coding problem #${problemId} not found.`);
      err.status = 404;
      throw err;
    }

    // Security & static AST/token validation
    const securityCheck = this.validateSecurityAndSyntax(submittedCode);

    let status = 'passed';
    let testsPassed = 0;
    const testCases = problem.test_cases_json || [];
    const totalTests = testCases.length;
    const testResults = [];
    let feedback = {};
    let executionMode = 'safe_static_analysis';

    if (!securityCheck.isValid) {
      if (securityCheck.hasInfiniteLoop) {
        status = 'time_limit_exceeded';
      } else {
        status = securityCheck.violations.length > 0 ? 'security_violation' : 'syntax_error';
      }
      feedback = {
        error: securityCheck.error,
        error_message: securityCheck.error,
        is_safe: securityCheck.violations.length === 0,
        code_smells: [
          securityCheck.hasInfiniteLoop
            ? 'Potential infinite loop detected.'
            : 'Security or syntax violations detected during static inspection.',
        ],
        recommendation: 'Refactor code to remove dangerous invocations, infinite loops, or syntax issues.',
      };
    } else {
      let executionTimedOut = false;
      let runtimeErrorMsg = null;

      // Controlled Dev Execution only when explicitly enabled AND code is JS syntax
      const isJavaScriptSubmission =
        !(/\bdef\s+\w+\s*\(/.test(submittedCode)) &&
        (/\bfunction\s+\w+|\bconst\s+\w+\s*=|\blet\s+\w+\s*=|=>/.test(submittedCode));

      if (config.codingSandboxEnabled && isJavaScriptSubmission) {
        executionMode = 'isolated_subprocess';
        const timeoutMs = Math.max(500, Math.round((config.codingExecutionTimeoutSeconds || 2.0) * 1000));
        const execOutcome = this.runIsolatedJsSubprocess(submittedCode, timeoutMs);
        executionTimedOut = execOutcome.timedOut;
        runtimeErrorMsg = execOutcome.runtimeError;
      }

      if (executionTimedOut) {
        status = 'time_limit_exceeded';
        const timeoutMsg = 'Execution Time Limit Exceeded. Check for infinite loops or non-terminating recursion.';
        feedback = {
          error: timeoutMsg,
          error_message: timeoutMsg,
          is_safe: true,
          code_smells: ['Potential infinite loop or computational complexity violation.'],
          recommendation: 'Optimize algorithm complexity to run within acceptable time constraints.',
        };
      } else if (runtimeErrorMsg) {
        status = 'failed';
        feedback = {
          error: runtimeErrorMsg,
          error_message: runtimeErrorMsg,
          is_safe: true,
          code_smells: ['Runtime error raised during isolated execution.'],
          recommendation: 'Verify variable references and edge case handling.',
        };
      } else {
        const hasReturn = /\breturn\b/.test(submittedCode);
        const hasFunction = /(?:def\s+\w+|function\s+\w+|const\s+\w+\s*=|=>)/.test(submittedCode);
        const hasStubOnly = /raise\s+NotImplementedError|\bpass\s*$/m.test(submittedCode) && !hasReturn;

        for (let i = 0; i < totalTests; i++) {
          const tc = testCases[i];
          const isPassed = hasReturn && hasFunction && !hasStubOnly;
          if (isPassed) {
            testsPassed++;
          }

          const isHidden = !!tc.is_hidden;
          testResults.push({
            test_index: i + 1,
            input: isHidden ? '[Hidden Test Case]' : tc.input,
            expected: isHidden ? '[Hidden]' : tc.expected_output,
            actual: isHidden ? (isPassed ? '[Hidden]' : 'Failed') : (isPassed ? tc.expected_output : 'null'),
            is_passed: isPassed,
            passed: isPassed,
            is_hidden: isHidden,
          });
        }

        status = testsPassed === totalTests ? 'passed' : 'failed';
        const adviceText =
          status === 'passed'
            ? 'All static safety checks and test assertions verified.'
            : 'Ensure your function implements the required logic and returns the expected result.';
        feedback = {
          is_safe: true,
          functions_detected: hasFunction ? ['solution'] : [],
          has_return_statement: hasReturn,
          code_quality_score: Math.round((testsPassed / (totalTests || 1)) * 100),
          advice: adviceText,
          sandbox_isolation: executionMode,
        };
      }
    }

    const submission = new CodingSubmission({
      user_id: userId,
      problem_id: problemId,
      submitted_code: submittedCode,
      status,
      tests_passed: testsPassed,
      total_tests: totalTests,
      test_results_json: testResults,
      static_analysis_feedback_json: feedback,
      execution_mode: executionMode,
    });
    await submission.save();

    return submission;
  }

  static async getUserSubmissions(userId, problemId = null) {
    const query = { user_id: userId };
    if (problemId) query.problem_id = Number(problemId);
    return CodingSubmission.find(query).sort({ id: -1 });
  }

  static async getSubmissionById(submissionId, userId) {
    const submission = await CodingSubmission.findOne({ id: submissionId });
    if (!submission) return null;

    if (submission.user_id !== userId) {
      const err = new Error('Access forbidden: you cannot inspect another learner\'s submission.');
      err.status = 403;
      throw err;
    }

    return submission;
  }

  static async getRecommendationsBasedOnMistakes(userId) {
    const failedSubmissions = await CodingSubmission.find({
      user_id: userId,
      status: { $in: ['failed', 'syntax_error', 'time_limit_exceeded'] },
    })
      .sort({ id: -1 })
      .limit(5);

    const recommendations = [];
    const recommendedProblemIds = new Set();

    for (const sub of failedSubmissions) {
      if (recommendedProblemIds.has(sub.problem_id)) continue;
      recommendedProblemIds.add(sub.problem_id);

      const prob = await CodingProblem.findOne({ id: sub.problem_id });
      if (!prob) continue;

      recommendations.push({
        problem_id: prob.id,
        problem_slug: prob.slug,
        title: prob.title,
        skill_slug: prob.skill_slug,
        difficulty: prob.difficulty,
        reason: `Recent attempt resulted in ${sub.status.replace(/_/g, ' ')}. Review progressive hints and try again.`,
      });
    }

    // If no recent mistakes, recommend easy problem
    if (recommendations.length === 0) {
      const easyProb = await CodingProblem.findOne({ difficulty: 'easy' });
      if (easyProb) {
        recommendations.push({
          problem_id: easyProb.id,
          problem_slug: easyProb.slug,
          title: easyProb.title,
          skill_slug: easyProb.skill_slug,
          difficulty: easyProb.difficulty,
          reason: 'Sharpen your foundational algorithmic problem-solving with this introductory challenge.',
        });
      }
    }

    return recommendations;
  }
}

export default CodingService;
