import config from '../config/index.js';

export const FALLBACK_NOTICE_HEADER = '[SkillBridge Deterministic Fallback Active - No LLM Provider Configured]\n\n';

export const CONCEPT_KNOWLEDGE = {
  python:
    'In Python, variables are dynamically typed and memory is managed via reference counting and garbage collection. ' +
    'Key concepts include list comprehensions `[x for x in seq if cond]`, generators `yield`, ' +
    'and object-oriented principles with classes and dunder methods (`__init__`, `__repr__`).',
  sql:
    'SQL (Structured Query Language) manages relational databases. Use `INNER JOIN` for matching rows across tables, ' +
    '`LEFT JOIN` to preserve all records from the left table, and `GROUP BY` with `HAVING` to filter aggregated results. ' +
    'Proper indexing on frequently queried columns significantly accelerates execution.',
  dsa:
    'Data Structures & Algorithms form computational foundations. Arrays offer O(1) random access by index; ' +
    'Trees (BSTs) provide O(log n) average search time; Hash Maps achieve O(1) expected lookup. ' +
    'Analyze algorithms using Big-O notation for time and space complexity.',
  networking:
    'The OSI 7-layer model standardizes network communication from Physical (Layer 1) to Application (Layer 7). ' +
    'TCP provides reliable, ordered, error-checked packet streams via a 3-way handshake (SYN, SYN-ACK, ACK), ' +
    'whereas UDP offers low-latency connectionless datagram delivery.',
  cybersecurity:
    'Information security relies on the CIA Triad: Confidentiality (privacy via encryption), ' +
    'Integrity (tamper prevention via cryptographic hashing), and Availability (resilience against DDoS). ' +
    'Always adhere to the principle of least privilege and defend against OWASP Top 10 vulnerabilities like SQL injection and XSS.',
  java:
    'Java is a strongly typed, object-oriented language running on the Java Virtual Machine (JVM). ' +
    'Key pillars include encapsulation, inheritance, polymorphism, and abstraction. ' +
    'Memory is managed automatically by the Garbage Collector.',
  react:
    'React is a component-driven JavaScript library for building user interfaces using a Virtual DOM. ' +
    'State and lifecycle behaviors are managed with React Hooks such as `useState`, `useEffect`, and `useMemo`.',
  'binary search':
    'Binary search is an efficient search algorithm on sorted collections. It repeatedly checks the midpoint ' +
    'and halves the search space at every step, yielding O(log N) logarithmic time complexity and O(1) space.',
};

const INJECTION_PATTERNS = [
  /ignore (all )?previous instructions/i,
  /override (system )?policy/i,
  /reveal (the )?secret/i,
  /you are now (an evil|dan)/i,
  /disregard (the )?rules/i,
];

export class DeterministicFallbackLLMClient {
  static generateCompletion(messages, systemPrompt = '') {
    let userQuery = '';
    let fullContext = systemPrompt || '';

    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userQuery = messages[i].content;
        break;
      }
    }

    for (const m of messages) {
      fullContext += ` ${m.content}`;
    }

    const queryLower = userQuery.toLowerCase();
    const contextLower = fullContext.toLowerCase();

    // 1. Prompt Injection Defense
    for (const pat of INJECTION_PATTERNS) {
      if (pat.test(contextLower)) {
        return {
          content:
            `${FALLBACK_NOTICE_HEADER}` +
            'Security Notice: The retrieved document or query contains instructions attempting to override ' +
            'system policies or reveal confidential data. In accordance with platform security guidelines, ' +
            'untrusted instructions embedded inside documents are safely ignored.',
          provider: 'deterministic_fallback',
          model: 'rule_based_tutor_v1',
          is_fallback: true,
          tokens_used: 45,
        };
      }
    }

    // 2. RAG Document Grounding
    if (contextLower.includes('<document_context')) {
      const docMatch = fullContext.match(/<document_context[^>]*>([\s\S]*?)<\/document_context>/i);
      if (docMatch && docMatch[1]) {
        const docText = docMatch[1].trim();
        const queryWords = queryLower.split(/\W+/).filter(w => w.length > 3);
        const hasOverlap = queryWords.some(w => docText.toLowerCase().includes(w));

        if (hasOverlap) {
          const excerpt = docText.replace(/\n+/g, ' ').slice(0, 350);
          return {
            content:
              `${FALLBACK_NOTICE_HEADER}` +
              `According to the approved educational document:\n\n> "${excerpt}..."\n\n` +
              'This excerpt directly addresses your query regarding foundational concepts.',
            provider: 'deterministic_fallback',
            model: 'rule_based_tutor_v1',
            is_fallback: true,
            tokens_used: 65,
          };
        } else {
          return {
            content:
              `${FALLBACK_NOTICE_HEADER}` +
              'Based on the approved educational documents available, there is insufficient evidence to answer this question. ' +
              'Please refer to standard course materials or consult an instructor.',
            provider: 'deterministic_fallback',
            model: 'rule_based_tutor_v1',
            is_fallback: true,
            tokens_used: 35,
          };
        }
      }
    }

    // 3. Hints or Clues
    if (queryLower.includes('hint') || queryLower.includes('clue')) {
      return {
        content:
          `${FALLBACK_NOTICE_HEADER}` +
          'Pedagogical Hint:\n' +
          '- Break the problem into its foundational components.\n' +
          '- Review the function parameters and return type requirements.\n' +
          '- Think about edge cases: empty collections, single-item inputs, and boundary values.\n' +
          '- Consider whether a two-pointer approach or hash set can optimize your runtime.',
        provider: 'deterministic_fallback',
        model: 'rule_based_tutor_v1',
        is_fallback: true,
        tokens_used: 50,
      };
    }

    // 4. Career Guidance
    if (queryLower.includes('career') || queryLower.includes('roadmap') || queryLower.includes('job')) {
      return {
        content:
          `${FALLBACK_NOTICE_HEADER}` +
          'Career Guidance Tip:\n' +
          '- Review your Career Gap Analysis in the dashboard to identify prioritized competency gaps.\n' +
          '- Focus on foundational prerequisites (mastery >= 60%) before tackling advanced enterprise frameworks.\n' +
          '- Build demonstrable evidence by completing hands-on project milestones with public repository links.\n\n' +
          'Note: SkillBridge AI provides skills assessment and roadmap synthesis but does not guarantee employment or compensation outcomes.',
        provider: 'deterministic_fallback',
        model: 'rule_based_tutor_v1',
        is_fallback: true,
        tokens_used: 70,
      };
    }

    // 5. Domain Concept Explanations
    for (const [key, explanation] of Object.entries(CONCEPT_KNOWLEDGE)) {
      if (queryLower.includes(key)) {
        return {
          content:
            `${FALLBACK_NOTICE_HEADER}` +
            `Concept Explanation (${key.toUpperCase()}):\n\n${explanation}\n\n` +
            'Recommended Next Step: Take a diagnostic assessment in the Taxonomy tab to test your comprehension.',
          provider: 'deterministic_fallback',
          model: 'rule_based_tutor_v1',
          is_fallback: true,
          tokens_used: 60,
        };
      }
    }

    // 6. Default Encouraging Tutor Intro
    return {
      content:
        `${FALLBACK_NOTICE_HEADER}` +
        'Hello! I am your SkillBridge AI Tutor operating in deterministic offline mode.\n\n' +
        'I can assist you with:\n' +
        '- Explaining technical concepts across Python, Java, SQL, DSA, Web Dev, Networking, and Cybersecurity.\n' +
        '- Providing hints on coding exercises and assessments without spoiling solutions.\n' +
        '- Interpreting your career gap analysis and roadmap milestones.\n' +
        '- Answering questions grounded in approved educational documents.\n\n' +
        'How can I assist your learning today?',
      provider: 'deterministic_fallback',
      model: 'rule_based_tutor_v1',
      is_fallback: true,
      tokens_used: 65,
    };
  }
}

export class LLMAdapter {
  static dailyUsage = new Map(); // Map<string, number> key: `${userId}:${YYYY-MM-DD}`

  static checkAndIncrementRateLimit(userId) {
    if (!userId) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const key = `${userId}:${todayStr}`;
    const current = this.dailyUsage.get(key) || 0;

    if (current >= config.tutorDailyRateLimit) {
      const err = new Error(
        `Daily AI tutor query limit of ${config.tutorDailyRateLimit} requests exceeded. Please try again tomorrow.`
      );
      err.status = 429;
      throw err;
    }

    this.dailyUsage.set(key, current + 1);
  }

  static async completeChat(messages, systemPrompt = null, userId = null) {
    if (userId) {
      this.checkAndIncrementRateLimit(userId);
    }

    const provider = config.aiProvider;

    // External Live LLM: Gemini
    if (provider === 'gemini' && config.geminiApiKey) {
      try {
        const promptText = (systemPrompt ? `${systemPrompt}\n\n` : '') +
          messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.geminiModel)}:generateContent`;
        const resp = await globalThis.fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': config.geminiApiKey,
          },
          signal: AbortSignal.timeout(Math.max(1000, config.llmTimeoutSeconds * 1000)),
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              maxOutputTokens: config.llmMaxTokens,
              temperature: config.llmTemperature,
            },
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidate) {
            return {
              content: candidate,
              is_fallback: false,
              provider: 'gemini',
              model: config.geminiModel,
              tokens_used: data.usageMetadata?.totalTokenCount || 100,
            };
          }
        } else {
          console.warn(`Gemini API returned status ${resp.status}, falling back to deterministic tutor.`);
        }
      } catch (e) {
        console.warn('Gemini LLM call failed, falling back to deterministic tutor:', e.message);
      }
    }

    // External Live LLM: OpenAI
    if (provider === 'openai' && config.openaiApiKey) {
      try {
        const formattedMessages = [];
        if (systemPrompt) {
          formattedMessages.push({ role: 'system', content: systemPrompt });
        }
        for (const m of messages) {
          formattedMessages.push({ role: m.role, content: m.content });
        }

        const resp = await globalThis.fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.openaiApiKey}`,
          },
          signal: AbortSignal.timeout(Math.max(1000, config.llmTimeoutSeconds * 1000)),
          body: JSON.stringify({
            model: config.openaiModel,
            messages: formattedMessages,
            max_tokens: config.llmMaxTokens,
            temperature: config.llmTemperature,
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply) {
            return {
              content: reply,
              is_fallback: false,
              provider: 'openai',
              model: config.openaiModel,
              tokens_used: data.usage?.total_tokens || 100,
            };
          }
        } else {
          console.warn(`OpenAI API returned status ${resp.status}, falling back to deterministic tutor.`);
        }
      } catch (e) {
        console.warn('OpenAI LLM call failed, falling back to deterministic tutor:', e.message);
      }
    }

    // Default: Deterministic Rule-Based Fallback
    return DeterministicFallbackLLMClient.generateCompletion(messages, systemPrompt);
  }
}

export default LLMAdapter;
