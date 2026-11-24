import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../src/config/database.js';
import {
  User,
  StudentProfile,
  Skill,
  SkillMastery,
  Course,
  CourseProgress,
  Assessment,
  Question,
  AssessmentAttempt,
  AssessmentResponse,
  CodingProblem,
  Document,
  Feedback,
  LearnerActivity,
} from '../src/models/index.js';
import RAGService from '../src/services/ragService.js';

async function ensureSkill(spec) {
  let skill = await Skill.findOne({ slug: spec.slug });
  if (!skill) {
    skill = await Skill.create(spec);
  }
  return skill;
}

async function ensureAssessmentWithQuestions(spec, questionSpecs) {
  let asm = await Assessment.findOne({ title: spec.title });
  if (!asm) {
    asm = await Assessment.findOne({ skill_id: spec.skill_id });
  }
  if (!asm) {
    asm = await Assessment.create(spec);
  }

  for (const qSpec of questionSpecs) {
    const exists = await Question.findOne({
      assessment_id: asm.id,
      prompt: qSpec.prompt,
    });
    if (!exists) {
      await Question.create({
        assessment_id: asm.id,
        prompt: qSpec.prompt,
        question_type: 'single_choice',
        options_json: qSpec.options,
        correct_answer_json: qSpec.correct,
        explanation: qSpec.explanation,
        difficulty: qSpec.difficulty || 'medium',
        points: qSpec.points || 10,
      });
    }
  }
  return asm;
}

export async function seedMongoDatabase(options = {}) {
  const disconnectAfter = options.disconnect !== undefined ? options.disconnect : true;
  console.log('Seeding MongoDB with complete SkillBridge AI platform data...');
  await connectDB();

  try {
    // 1. Admin & Demo Student Accounts
    const adminEmail = 'admin@skillbridge.ai';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      const salt = await bcrypt.genSalt(12);
      const hash = await bcrypt.hash('Admin@123456', salt);
      admin = new User({
        email: adminEmail,
        hashed_password: hash,
        full_name: 'Lead Administrator',
        role: 'admin',
        is_active: true,
        is_verified: true,
      });
      await admin.save();
      console.log(`[Seed] Created admin account: ${adminEmail}`);
    }

    const studentEmail = 'student@skillbridge.ai';
    let student = await User.findOne({ email: studentEmail });
    if (!student) {
      const salt = await bcrypt.genSalt(12);
      const hash = await bcrypt.hash('Student@123456', salt);
      student = new User({
        email: studentEmail,
        hashed_password: hash,
        full_name: 'Demo Student',
        role: 'student',
        is_active: true,
        is_verified: true,
      });
      await student.save();

      await StudentProfile.create({
        user_id: student.id,
        headline: 'Aspiring Full-Stack Software Engineer',
        bio: 'Computer science learner mastering Python, Java, MERN Stack, SQL, and Machine Learning.',
        target_role: 'Full Stack Engineer',
        education_level: 'Bachelor of Computer Science',
        target_hours_per_week: 15,
        preferred_learning_style: 'hands_on',
      });
      console.log(`[Seed] Created demo student account: ${studentEmail}`);
    }

    // 2. Ensure core Skills exist for all 5 main course domains
    const pythonSkill = await ensureSkill({
      slug: 'python-basics',
      title: 'Python Basics & Control Flow',
      category: 'Python',
      difficulty_level: 'beginner',
      description: 'Core Python syntax, data structures, functions, and idiomatic iteration.',
    });
    const javaSkill = await ensureSkill({
      slug: 'java-oop-core',
      title: 'Java Programming & OOP',
      category: 'Java',
      difficulty_level: 'beginner',
      description: 'Object-oriented design, JVM execution model, generics, and Java collections.',
    });
    const jsMernSkill = await ensureSkill({
      slug: 'javascript-mern-fundamentals',
      title: 'JavaScript & MERN Architecture',
      category: 'Web Development',
      difficulty_level: 'intermediate',
      description: 'Modern ES6+ JavaScript, React components, Node.js Express APIs, and MongoDB.',
    });
    const sqlSkill = await ensureSkill({
      slug: 'sql-fundamentals',
      title: 'SQL & Relational Databases',
      category: 'SQL',
      difficulty_level: 'beginner',
      description: 'Relational database modeling, JOINs, indexing, transactions, and query optimization.',
    });
    const dsMlSkill = await ensureSkill({
      slug: 'data-science-ml-foundations',
      title: 'Data Science & Machine Learning',
      category: 'Data Science',
      difficulty_level: 'intermediate',
      description: 'Data wrangling, feature engineering, regression, classification, and model evaluation.',
    });
    const dsaSkill = await ensureSkill({
      slug: 'dsa-arrays-strings',
      title: 'DSA: Arrays & Two Pointers',
      category: 'DSA',
      difficulty_level: 'intermediate',
      description: 'Array traversal, sliding window, two-pointer techniques, and complexity analysis.',
    });
    const netSkill = await ensureSkill({
      slug: 'networking-http-tcp',
      title: 'Computer Networking & HTTP',
      category: 'Networking',
      difficulty_level: 'beginner',
      description: 'TCP/IP model, DNS resolution, HTTP semantics, TLS handshakes, and REST architecture.',
    });
    const secSkill = await ensureSkill({
      slug: 'cybersecurity-appsec',
      title: 'Application Security & OWASP',
      category: 'Cybersecurity',
      difficulty_level: 'intermediate',
      description: 'Authentication hardening, injection defense, XSS mitigation, and cryptographic hygiene.',
    });

    // 3. Ensure every suitable Quiz Assessment has >= 5 questions with 4 options + explanation
    const pythonAsm = await ensureAssessmentWithQuestions(
      {
        title: 'Python Syntax Diagnostic',
        description: 'Evaluate core Python syntax, mutability semantics, comprehensions, and exception safety.',
        skill_id: pythonSkill.id,
        assessment_type: 'diagnostic',
        pass_percentage: 70,
        time_limit_minutes: 15,
      },
      [
        {
          prompt: 'Which keyword defines a function in Python?',
          options: ['func', 'def', 'function', 'fn'],
          correct: 'def',
          explanation: 'Python uses the `def` keyword followed by the function name and parameter list.',
          difficulty: 'easy',
        },
        {
          prompt: 'What is the output of [x * x for x in range(4) if x % 2 == 0]?',
          options: ['[0, 4]', '[0, 1, 4, 9]', '[4]', '[0, 2]'],
          correct: '[0, 4]',
          explanation: 'Only even numbers in range(4) are 0 and 2; squaring them produces 0 and 4.',
          difficulty: 'medium',
        },
        {
          prompt: 'What happens when you use a mutable list [] as a default parameter value in a Python function?',
          options: [
            'A new list is instantiated on every function call',
            'The same list object is retained and shared across invocations',
            'Python raises a SyntaxError at compilation time',
            'The list is automatically converted to an immutable tuple',
          ],
          correct: 'The same list object is retained and shared across invocations',
          explanation: 'Default argument expressions are evaluated once at function definition time in Python.',
          difficulty: 'medium',
        },
        {
          prompt: 'Which built-in Python collection guarantees unique elements with O(1) average lookup?',
          options: ['list', 'tuple', 'set', 'deque'],
          correct: 'set',
          explanation: 'Python sets are hash-table backed collections that store distinct elements with constant average membership lookup.',
          difficulty: 'easy',
        },
        {
          prompt: 'Which statement guarantees cleanup code executes whether or not an exception occurred in a try block?',
          options: ['catch', 'always', 'finally', 'ensure'],
          correct: 'finally',
          explanation: 'A `finally` block always executes before leaving the try/except construct, making it ideal for resource cleanup.',
          difficulty: 'easy',
        },
      ]
    );

    const sqlAsm = await ensureAssessmentWithQuestions(
      {
        title: 'SQL Querying & Filtering Assessment',
        description: 'Assess relational querying, JOIN behavior, aggregations, and transaction guarantees.',
        skill_id: sqlSkill.id,
        assessment_type: 'formative',
        pass_percentage: 70,
        time_limit_minutes: 15,
      },
      [
        {
          prompt: 'Which SQL clause filters groups AFTER aggregation has been performed?',
          options: ['WHERE', 'HAVING', 'GROUP BY', 'ORDER BY'],
          correct: 'HAVING',
          explanation: 'WHERE filters individual rows before grouping, whereas HAVING filters aggregated groups after GROUP BY.',
          difficulty: 'easy',
        },
        {
          prompt: 'Which JOIN preserves all rows from the left table even when there is no matching row in the right table?',
          options: ['INNER JOIN', 'LEFT OUTER JOIN', 'CROSS JOIN', 'NATURAL JOIN'],
          correct: 'LEFT OUTER JOIN',
          explanation: 'LEFT OUTER JOIN returns every record from the left table and fills unmatched right columns with NULL.',
          difficulty: 'easy',
        },
        {
          prompt: 'What is the primary purpose of a B-Tree index on a database column?',
          options: [
            'To compress column storage by 90%',
            'To accelerate read lookups and range scans without full table scans',
            'To encrypt sensitive personal data at rest',
            'To replace primary key uniqueness constraints',
          ],
          correct: 'To accelerate read lookups and range scans without full table scans',
          explanation: 'Indexes maintain balanced search trees enabling O(log n) lookups instead of linear full table scans.',
          difficulty: 'medium',
        },
        {
          prompt: 'In ACID transactions, what does Atomicity guarantee?',
          options: [
            'Concurrent queries never read uncommitted temporary rows',
            'All operations within a transaction succeed completely or roll back together',
            'Committed writes remain persisted even after power failure',
            'Database foreign keys always stay valid',
          ],
          correct: 'All operations within a transaction succeed completely or roll back together',
          explanation: 'Atomicity ensures an all-or-nothing execution unit so partial state updates cannot corrupt data.',
          difficulty: 'medium',
        },
        {
          prompt: 'Which SQL keyword removes duplicate rows from a SELECT query result set?',
          options: ['UNIQUE', 'SINGLE', 'DISTINCT', 'NODUP'],
          correct: 'DISTINCT',
          explanation: 'SELECT DISTINCT instructs the SQL engine to deduplicate identical result rows.',
          difficulty: 'easy',
        },
      ]
    );

    const javaAsm = await ensureAssessmentWithQuestions(
      {
        title: 'Java Programming & OOP Assessment',
        description: 'Validate object-oriented principles, JVM memory behavior, interfaces, and Collections API.',
        skill_id: javaSkill.id,
        assessment_type: 'formative',
        pass_percentage: 70,
        time_limit_minutes: 15,
      },
      [
        {
          prompt: 'Which keyword allows a subclass in Java to invoke a constructor or method of its parent class?',
          options: ['this', 'parent', 'super', 'base'],
          correct: 'super',
          explanation: 'In Java, `super` refers directly to the immediate parent class constructor or overridden methods.',
          difficulty: 'easy',
        },
        {
          prompt: 'Which OOP mechanism allows one interface to expose different implementations at runtime in Java?',
          options: ['Encapsulation', 'Polymorphism', 'Serialization', 'Reflection'],
          correct: 'Polymorphism',
          explanation: 'Runtime polymorphism dynamically dispatches overridden method calls according to the actual object instance type.',
          difficulty: 'easy',
        },
        {
          prompt: 'Which Java collection preserves insertion order and permits O(1) indexed random access?',
          options: ['HashSet', 'TreeMap', 'ArrayList', 'PriorityQueue'],
          correct: 'ArrayList',
          explanation: 'ArrayList is backed by a contiguous resizable array providing O(1) indexed access.',
          difficulty: 'easy',
        },
        {
          prompt: 'What does declaring a class `final` prevent in Java?',
          options: [
            'Creating any instance of the class',
            'Inheriting / subclassing that class',
            'Declaring public methods inside the class',
            'Storing instances in a HashMap',
          ],
          correct: 'Inheriting / subclassing that class',
          explanation: 'Marking a class `final` prevents any other class from extending it via inheritance.',
          difficulty: 'medium',
        },
        {
          prompt: 'Why is `StringBuilder` preferred over `String` concatenation inside large loops in Java?',
          options: [
            'StringBuilder avoids allocating a new immutable String object on every iteration',
            'StringBuilder automatically encrypts text',
            'String cannot store Unicode characters',
            'StringBuilder stores strings directly on the CPU cache',
          ],
          correct: 'StringBuilder avoids allocating a new immutable String object on every iteration',
          explanation: 'Because Java Strings are immutable, concatenating inside loops creates O(n^2) temporary objects, whereas StringBuilder mutates a single buffer.',
          difficulty: 'medium',
        },
      ]
    );

    const jsMernAsm = await ensureAssessmentWithQuestions(
      {
        title: 'JavaScript & MERN Stack Evaluation',
        description: 'Test modern asynchronous JS, React hooks, Express middleware, and MongoDB document queries.',
        skill_id: jsMernSkill.id,
        assessment_type: 'formative',
        pass_percentage: 70,
        time_limit_minutes: 15,
      },
      [
        {
          prompt: 'In Express.js middleware, what is the role of calling `next()`?',
          options: [
            'Immediately terminates the Node.js process',
            'Passes control to the next middleware function or route handler in the stack',
            'Replays the previous HTTP request automatically',
            'Serializes all Mongoose documents to CSV',
          ],
          correct: 'Passes control to the next middleware function or route handler in the stack',
          explanation: 'Express middleware forms a chain; calling `next()` hands execution to subsequent middleware or route handlers (or error handlers when `next(err)` is called).',
          difficulty: 'easy',
        },
        {
          prompt: 'Which React hook executes side effects such as API fetching after component mount or dependency change?',
          options: ['useState', 'useEffect', 'useRef', 'useMemo'],
          correct: 'useEffect',
          explanation: '`useEffect` runs side effects asynchronously after render and re-runs whenever items in its dependency array change.',
          difficulty: 'easy',
        },
        {
          prompt: 'What does `await Promise.all([p1, p2, p3])` do in JavaScript?',
          options: [
            'Runs p1, p2, and p3 sequentially one after another',
            'Waits concurrently for all promises to fulfill or rejects immediately if any promise rejects',
            'Ignores rejected promises and returns only strings',
            'Blocks the Node.js event loop thread synchronously',
          ],
          correct: 'Waits concurrently for all promises to fulfill or rejects immediately if any promise rejects',
          explanation: '`Promise.all` runs promises concurrently and resolves to an array of results once every promise fulfills.',
          difficulty: 'medium',
        },
        {
          prompt: 'Why should MongoDB queries avoid unescaped user regex input (`new RegExp(userInput)`)?',
          options: [
            'MongoDB does not support strings longer than 16 characters',
            'Unescaped metacharacters can alter query semantics and trigger ReDoS denial-of-service backtracking',
            'Regex automatically drops collections',
            'Express strips regex responses to 404',
          ],
          correct: 'Unescaped metacharacters can alter query semantics and trigger ReDoS denial-of-service backtracking',
          explanation: 'Escaping special regex characters prevents malformed patterns and catastrophic Regular Expression Denial of Service (ReDoS).',
          difficulty: 'medium',
        },
        {
          prompt: 'In HTTP JWT authentication, which status code correctly denotes a valid authenticated user lacking admin permissions?',
          options: ['401 Unauthorized', '403 Forbidden', '404 Not Found', '500 Internal Server Error'],
          correct: '403 Forbidden',
          explanation: '401 indicates missing/invalid credentials, whereas 403 indicates authenticated identity lacking authorization for the resource.',
          difficulty: 'easy',
        },
      ]
    );

    const dsMlAsm = await ensureAssessmentWithQuestions(
      {
        title: 'Data Science & Machine Learning Assessment',
        description: 'Verify understanding of bias-variance tradeoff, cross-validation, metrics, and overfitting control.',
        skill_id: dsMlSkill.id,
        assessment_type: 'formative',
        pass_percentage: 70,
        time_limit_minutes: 15,
      },
      [
        {
          prompt: 'Why must feature scaling statistics (mean/std) be computed ONLY on the training split and never the test split?',
          options: [
            'To make training slower intentionally',
            'To prevent data leakage from unseen evaluation samples into the model pipeline',
            'Because test sets cannot contain floating-point values',
            'Because NumPy does not support vectors on test sets',
          ],
          correct: 'To prevent data leakage from unseen evaluation samples into the model pipeline',
          explanation: 'Fitting scalers on test data leaks test distribution statistics into training and inflates validation metrics.',
          difficulty: 'medium',
        },
        {
          prompt: 'Which evaluation metric is most informative on a heavily imbalanced fraud detection dataset (99% negative, 1% positive)?',
          options: ['Raw Accuracy', 'Precision-Recall / F1-Score', 'Training MSE', 'Number of epochs'],
          correct: 'Precision-Recall / F1-Score',
          explanation: 'On highly imbalanced data, a trivial model predicting all negatives reaches 99% accuracy while failing to detect positives; F1 and PR-AUC measure minority class performance.',
          difficulty: 'medium',
        },
        {
          prompt: 'What symptom directly indicates high variance (overfitting)?',
          options: [
            'Low accuracy on both training and validation sets',
            'Very high training accuracy accompanied by noticeably lower validation/test accuracy',
            'Model fails to converge during dataset loading',
            'Identical loss on random labels',
          ],
          correct: 'Very high training accuracy accompanied by noticeably lower validation/test accuracy',
          explanation: 'Overfitting occurs when a model memorizes training noise rather than generalizing to unseen validation samples.',
          difficulty: 'easy',
        },
        {
          prompt: 'What does L2 (Ridge) regularization add to the loss function?',
          options: [
            'The sum of squared model weights multiplied by a penalty coefficient',
            'Extra hidden layers at runtime',
            'Shuffling of target labels',
            'Removal of intercept terms',
          ],
          correct: 'The sum of squared model weights multiplied by a penalty coefficient',
          explanation: 'L2 regularization penalizes large weight magnitudes smoothly to reduce variance and stabilize linear/neural models.',
          difficulty: 'medium',
        },
        {
          prompt: 'What is the main advantage of k-fold cross-validation over a single train/validation split?',
          options: [
            'It uses zero training compute',
            'Every sample participates in both training and validation across folds, yielding lower-variance performance estimates',
            'It eliminates the need for a held-out test set permanently',
            'It converts classification into clustering',
          ],
          correct: 'Every sample participates in both training and validation across folds, yielding lower-variance performance estimates',
          explanation: 'Averaging metrics across k folds avoids lucky or unlucky single splits when evaluating model generalization.',
          difficulty: 'easy',
        },
      ]
    );

    // Also top-up existing DSA / Networking / Cybersecurity assessments to >=5 questions when present
    await ensureAssessmentWithQuestions(
      {
        title: 'DSA: Arrays & Two Pointers Evaluation',
        description: 'Algorithmic efficiency with arrays, sliding window, and two-pointer invariants.',
        skill_id: dsaSkill.id,
        assessment_type: 'formative',
        pass_percentage: 70,
        time_limit_minutes: 15,
      },
      [
        {
          prompt: 'What is the optimal time complexity to find two numbers summing to a target inside a SORTED array using two pointers?',
          options: ['O(n^2)', 'O(n log n)', 'O(n)', 'O(1)'],
          correct: 'O(n)',
          explanation: 'Converging left and right pointers from opposite ends inspects each element at most once in O(n) time.',
          difficulty: 'easy',
        },
        {
          prompt: 'Why is a hash map useful for solving Two Sum on an UNSORTED array in linear time?',
          options: [
            'Hash maps automatically sort arrays in O(1)',
            'Hash maps check whether `target - num` was already seen in O(1) average lookup',
            'Hash maps reduce space complexity to zero',
            'Hash maps prevent integer overflow',
          ],
          correct: 'Hash maps check whether `target - num` was already seen in O(1) average lookup',
          explanation: 'Trading O(n) memory for O(1) complement lookups avoids nested O(n^2) loops.',
          difficulty: 'easy',
        },
        {
          prompt: 'When is a Sliding Window algorithm most applicable?',
          options: [
            'Contiguous subarray or substring constraint problems',
            'Shortest path in weighted negative-cycle graphs',
            'Sorting arbitrary binary trees',
            'Matrix determinant calculation',
          ],
          correct: 'Contiguous subarray or substring constraint problems',
          explanation: 'Sliding windows maintain state over contiguous spans while expanding/shrinking bounds in O(n).',
          difficulty: 'medium',
        },
        {
          prompt: 'What is the worst-case time complexity of Binary Search on a sorted array of length n?',
          options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
          correct: 'O(log n)',
          explanation: 'Each comparison halves the remaining search space, resulting in O(log n) worst-case steps.',
          difficulty: 'easy',
        },
        {
          prompt: 'Which data structure follows LIFO order and is ideal for matching balanced parentheses?',
          options: ['Queue', 'Min-Heap', 'Stack', 'Graph'],
          correct: 'Stack',
          explanation: 'A Last-In-First-Out stack naturally matches each closing bracket with the most recent open bracket.',
          difficulty: 'easy',
        },
      ]
    );

    await ensureAssessmentWithQuestions(
      {
        title: 'Networking Core Diagnostic',
        description: 'OSI/TCP layers, HTTP methods, DNS, and TLS connection basics.',
        skill_id: netSkill.id,
        assessment_type: 'diagnostic',
        pass_percentage: 70,
        time_limit_minutes: 15,
      },
      [
        {
          prompt: 'Which HTTP method is idempotent and intended to completely replace an existing resource?',
          options: ['POST', 'PUT', 'PATCH', 'CONNECT'],
          correct: 'PUT',
          explanation: 'PUT is idempotent because repeating the identical PUT request yields the same target state.',
          difficulty: 'easy',
        },
        {
          prompt: 'Which protocol resolves human-readable hostnames like api.skillbridge.ai to IP addresses?',
          options: ['ARP', 'DNS', 'DHCP', 'ICMP'],
          correct: 'DNS',
          explanation: 'Domain Name System (DNS) translates domain names into routable IP addresses.',
          difficulty: 'easy',
        },
        {
          prompt: 'Why does TCP perform a three-way handshake (SYN, SYN-ACK, ACK)?',
          options: [
            'To compress JSON payloads',
            'To synchronize sequence numbers and establish reliable full-duplex connection state',
            'To bypass firewalls automatically',
            'To encrypt DNS queries',
          ],
          correct: 'To synchronize sequence numbers and establish reliable full-duplex connection state',
          explanation: 'Both client and server confirm reachability and initial sequence numbers before sending stream data.',
          difficulty: 'medium',
        },
        {
          prompt: 'Which transport protocol is preferred when low latency matters more than guaranteed in-order retransmission?',
          options: ['TCP', 'UDP', 'SMTP', 'SFTP'],
          correct: 'UDP',
          explanation: 'UDP sends datagrams without handshake or retransmission delays, powering VoIP, gaming, and QUIC.',
          difficulty: 'easy',
        },
        {
          prompt: 'What role does TLS play in HTTPS connections?',
          options: [
            'Assigns LAN IPv4 addresses',
            'Provides server authentication, transport encryption, and data integrity',
            'Caches HTML assets inside browsers',
            'Formats SQL queries',
          ],
          correct: 'Provides server authentication, transport encryption, and data integrity',
          explanation: 'Transport Layer Security protects confidentiality and integrity over insecure networks.',
          difficulty: 'easy',
        },
      ]
    );

    await ensureAssessmentWithQuestions(
      {
        title: 'Cybersecurity Foundations Diagnostic',
        description: 'Evaluate cryptographic hashing, injection mitigation, CORS, and least-privilege controls.',
        skill_id: secSkill.id,
        assessment_type: 'diagnostic',
        pass_percentage: 70,
        time_limit_minutes: 15,
      },
      [
        {
          prompt: 'Why is bcrypt preferred over raw SHA-256 for storing user passwords?',
          options: [
            'bcrypt outputs shorter 4-character strings',
            'bcrypt includes automatic per-password salting and configurable work-factor cost to resist brute-force GPUs',
            'SHA-256 cannot hash ASCII characters',
            'bcrypt allows recovering plaintext passwords',
          ],
          correct: 'bcrypt includes automatic per-password salting and configurable work-factor cost to resist brute-force GPUs',
          explanation: 'Slow adaptive key-derivation/hashing functions like bcrypt dramatically raise offline brute-force cost.',
          difficulty: 'medium',
        },
        {
          prompt: 'Which defense eliminates classic SQL injection vulnerabilities cleanly?',
          options: [
            'Stripping uppercase letters from input',
            'Using parameterized / prepared statements',
            'Increasing HTTP request timeout',
            'Renaming database tables randomly',
          ],
          correct: 'Using parameterized / prepared statements',
          explanation: 'Parameterized queries separate SQL syntax from untrusted data values so input can never alter query logic.',
          difficulty: 'easy',
        },
        {
          prompt: 'Why should `android:usesCleartextTraffic="true"` NOT remain enabled in production Android releases?',
          options: [
            'It prevents APK installation on Android 14+',
            'It exposes API tokens and credentials to plain-HTTP network interception / MitM attacks',
            'It disables local storage',
            'It forces Bluetooth permissions',
          ],
          correct: 'It exposes API tokens and credentials to plain-HTTP network interception / MitM attacks',
          explanation: 'Restricting cleartext HTTP to debug manifests ensures production builds communicate strictly over HTTPS.',
          difficulty: 'medium',
        },
        {
          prompt: 'What security risk does running untrusted user code via Node `vm` inside the main Express process carry?',
          options: [
            'Node `vm` is explicitly not a security boundary and allows prototype/constructor escapes to host `process`',
            'It stops CSS files from loading',
            'It disables JWT expiration',
            'It forces CORS wildcard headers',
          ],
          correct: 'Node `vm` is explicitly not a security boundary and allows prototype/constructor escapes to host `process`',
          explanation: 'Untrusted learner code must never run inside the primary application V8 isolate.',
          difficulty: 'hard',
        },
        {
          prompt: 'What does Principle of Least Privilege mean in API role enforcement?',
          options: [
            'Every logged-in student is granted admin rights by default',
            'Users receive only the minimum permissions necessary for their role, enforced server-side',
            'Only frontend buttons hide restricted routes',
            'Passwords never expire',
          ],
          correct: 'Users receive only the minimum permissions necessary for their role, enforced server-side',
          explanation: 'Authorization must always be verified server-side per endpoint based on least privilege.',
          difficulty: 'easy',
        },
      ]
    );

    // 4. Seed 5 Core Unlocked Courses with Modules & >= 4 Lessons Each
    const courseSeeds = [
      {
        slug: 'python-programming',
        title: 'Python Programming',
        subtitle: 'From foundational syntax and data structures to clean, idiomatic Python engineering',
        description:
          'Master Python variables, functions, comprehensions, object-oriented design, error handling, and production scripting with hands-on examples.',
        category: 'Python',
        difficulty_level: 'beginner',
        estimated_hours: 10,
        is_unlocked: true,
        skill_id: pythonSkill.id,
        skill_ref: pythonSkill._id,
        assessment_id: pythonAsm.id,
        assessment_ref: pythonAsm._id,
        modules: [
          {
            module_id: 'py-mod-1',
            title: 'Module 1: Python Syntax, Functions & Scope',
            order: 1,
            description: 'Understand Pythonic expressions, lexical scope, and safe function parameters.',
            lessons: [
              {
                lesson_id: 'py-l1',
                title: 'Functions, Parameters & Mutable Default Pitfalls',
                order: 1,
                duration_minutes: 15,
                content:
                  'Functions in Python are defined using the `def` keyword. Unlike statically typed languages, Python binds default parameter values once when the function object is created—meaning mutable defaults like lists retain state across calls. Always use `None` and initialize inside the function body.',
                code_example:
                  'def append_tag(tag: str, tags=None):\n    if tags is None:\n        tags = []\n    tags.append(tag)\n    return tags',
                key_takeaways: [
                  'Define reusable functions cleanly with `def` and type hints.',
                  'Avoid mutable default arguments such as `[]` or `{}`.',
                ],
              },
              {
                lesson_id: 'py-l2',
                title: 'Lists, Sets, Dictionaries & Comprehensions',
                order: 2,
                duration_minutes: 20,
                content:
                  'Choosing the right data structure directly determines time complexity. Lists maintain ordered sequences, dictionaries map keys in O(1) average time, and sets guarantee uniqueness. List comprehensions express map-and-filter transforms concisely without verbose loops.',
                code_example:
                  'even_squares = [x * x for x in range(10) if x % 2 == 0]\nunique_ids = {item.id for item in items}',
                key_takeaways: [
                  'Use sets for fast O(1) membership checks and deduplication.',
                  'Prefer readable comprehensions over nested append loops.',
                ],
              },
            ],
          },
          {
            module_id: 'py-mod-2',
            title: 'Module 2: Exception Handling & Clean Architecture',
            order: 2,
            description: 'Write resilient Python modules with structured error boundaries and context managers.',
            lessons: [
              {
                lesson_id: 'py-l3',
                title: 'Try / Except / Finally & Context Managers',
                order: 3,
                duration_minutes: 18,
                content:
                  'Reliable Python code catches specific exceptions rather than bare `except:` clauses, and leverages `finally` or `with` context managers so file descriptors and network sockets always close cleanly even after runtime errors.',
                code_example:
                  'try:\n    with open("notes.txt", "r", encoding="utf-8") as f:\n        data = f.read()\nexcept FileNotFoundError:\n    data = ""\nfinally:\n    print("Read attempt finished.")',
                key_takeaways: [
                  'Catch narrow exception types instead of silencing all errors.',
                  'Use `finally` or `with` blocks to guarantee cleanup.',
                ],
              },
              {
                lesson_id: 'py-l4',
                title: 'Iterators, Generators & Memory Efficiency',
                order: 4,
                duration_minutes: 15,
                content:
                  'Generators produce items lazily using `yield`, streaming arbitrarily large datasets with O(1) auxiliary memory rather than materializing entire lists upfront.',
                code_example:
                  'def read_chunks(lines):\n    for line in lines:\n        if line.strip():\n            yield line.strip()',
                key_takeaways: [
                  'Use `yield` generators to stream large sequences lazily.',
                ],
              },
            ],
          },
        ],
      },
      {
        slug: 'java-programming',
        title: 'Java Programming',
        subtitle: 'Strong static typing, OOP design patterns, Collections API & JVM best practices',
        description:
          'Build enterprise-grade object-oriented applications in Java covering classes, inheritance, polymorphism, generics, collections, and performance pitfalls.',
        category: 'Java',
        difficulty_level: 'beginner',
        estimated_hours: 12,
        is_unlocked: true,
        skill_id: javaSkill.id,
        skill_ref: javaSkill._id,
        assessment_id: javaAsm.id,
        assessment_ref: javaAsm._id,
        modules: [
          {
            module_id: 'java-mod-1',
            title: 'Module 1: Core OOP Principles in Java',
            order: 1,
            description: 'Encapsulation, inheritance with `super`, interfaces, and runtime polymorphism.',
            lessons: [
              {
                lesson_id: 'java-l1',
                title: 'Classes, Inheritance & The super Keyword',
                order: 1,
                duration_minutes: 20,
                content:
                  'Java organizes applications around classes and interfaces. Subclasses extend parent classes using `extends`, invoke superclass constructors via `super(...)`, and declare classes `final` when inheritance should be disallowed.',
                code_example:
                  'class CourseItem {\n    protected String title;\n    CourseItem(String title) { this.title = title; }\n}\nclass VideoLesson extends CourseItem {\n    VideoLesson(String title) { super(title); }\n}',
                key_takeaways: [
                  'Use `super` to chain parent constructors and methods.',
                  'Mark classes `final` when immutability or extension lock is required.',
                ],
              },
              {
                lesson_id: 'java-l2',
                title: 'Interfaces & Runtime Polymorphism',
                order: 2,
                duration_minutes: 20,
                content:
                  'Polymorphism decouples callers from concrete implementations: variables typed to an interface invoke the exact concrete subclass implementation at runtime.',
                code_example:
                  'interface Scorer { int score(String ans); }\nclass ExactScorer implements Scorer {\n    public int score(String ans) { return ans.equals("A") ? 10 : 0; }\n}',
                key_takeaways: [
                  'Program to interfaces rather than concrete classes for extensibility.',
                ],
              },
            ],
          },
          {
            module_id: 'java-mod-2',
            title: 'Module 2: Collections Framework & String Performance',
            order: 2,
            description: 'Choose the right List/Set/Map and avoid quadratic string allocations.',
            lessons: [
              {
                lesson_id: 'java-l3',
                title: 'ArrayList, HashMap & LinkedHashSet Internals',
                order: 3,
                duration_minutes: 20,
                content:
                  '`ArrayList` provides O(1) indexed reads backed by a dynamic array; `HashMap` offers constant average key lookups; `TreeMap` maintains sorted key order in O(log n).',
                code_example:
                  'List<String> modules = new ArrayList<>();\nmodules.add("OOP Foundations");\nSystem.out.println(modules.get(0));',
                key_takeaways: [
                  'Prefer `ArrayList` for indexed access and iteration.',
                  'Use `HashMap` when fast key-value lookup matters.',
                ],
              },
              {
                lesson_id: 'java-l4',
                title: 'Immutability & StringBuilder Buffer Efficiency',
                order: 4,
                duration_minutes: 15,
                content:
                  'Java `String` objects are immutable. Concatenating strings inside tight loops allocates redundant intermediate objects on the heap; `StringBuilder` mutates an internal char buffer linearly in O(n).',
                code_example:
                  'StringBuilder sb = new StringBuilder();\nfor (int i = 0; i < 100; i++) { sb.append(i).append(","); }',
                key_takeaways: [
                  'Use `StringBuilder` inside loops for string assembly.',
                ],
              },
            ],
          },
        ],
      },
      {
        slug: 'javascript-mern-stack',
        title: 'JavaScript and MERN Stack',
        subtitle: 'Full-stack web systems with React 18, Node.js Express, REST security & MongoDB',
        description:
          'Master modern asynchronous JavaScript, React state/hooks, Express middleware chains, JWT RBAC security, and MongoDB document modeling.',
        category: 'Web Development',
        difficulty_level: 'intermediate',
        estimated_hours: 14,
        is_unlocked: true,
        skill_id: jsMernSkill.id,
        skill_ref: jsMernSkill._id,
        assessment_id: jsMernAsm.id,
        assessment_ref: jsMernAsm._id,
        modules: [
          {
            module_id: 'mern-mod-1',
            title: 'Module 1: Modern Async JS & React Hooks',
            order: 1,
            description: 'Promises, async/await concurrency, and predictable React effects.',
            lessons: [
              {
                lesson_id: 'mern-l1',
                title: 'Concurrency with Async/Await & Promise.all',
                order: 1,
                duration_minutes: 18,
                content:
                  'Sequential `await` calls wait one-by-one unnecessarily when requests are independent. `Promise.all` dispatches concurrent I/O operations on Node/browser event loops and gathers all results together.',
                code_example:
                  'const [courses, overview] = await Promise.all([\n  fetch("/api/v1/courses"),\n  fetch("/api/v1/adaptive/overview")\n]);',
                key_takeaways: [
                  'Use `Promise.all` for independent parallel API calls.',
                ],
              },
              {
                lesson_id: 'mern-l2',
                title: 'React Lifecycle, State & useEffect Best Practices',
                order: 2,
                duration_minutes: 20,
                content:
                  '`useEffect` synchronizes components with external APIs or subscriptions cleanly without mutating render state, guarding async setState against unmounted components.',
                code_example:
                  'useEffect(() => {\n  let mounted = true;\n  loadCourses().then(c => mounted && setCourses(c));\n  return () => { mounted = false; };\n}, []);',
                key_takeaways: [
                  'Always clean up or guard async effects on unmount.',
                ],
              },
            ],
          },
          {
            module_id: 'mern-mod-2',
            title: 'Module 2: Node.js Express Middleware & MongoDB Security',
            order: 2,
            description: 'JWT authentication, HTTP 401 vs 403 semantics, and safe Mongoose queries.',
            lessons: [
              {
                lesson_id: 'mern-l3',
                title: 'Express Middleware Pipeline & Error Handling',
                order: 3,
                duration_minutes: 20,
                content:
                  'Express routes pass control linearly through middleware via `next()`. Central error middleware `(err, req, res, next)` maps validation, duplicate key, and authorization failures consistently.',
                code_example:
                  'export function requireAdmin(req, res, next) {\n  if (!req.user) return res.status(401).json({ detail: "Unauthorized" });\n  if (req.user.role !== "admin") return res.status(403).json({ detail: "Forbidden" });\n  return next();\n}',
                key_takeaways: [
                  'Use 401 for missing/invalid authentication and 403 for insufficient role privilege.',
                ],
              },
              {
                lesson_id: 'mern-l4',
                title: 'Safe MongoDB Querying & Schema Indexing',
                order: 4,
                duration_minutes: 18,
                content:
                  'Escape user-supplied strings before building regex queries to avoid ReDoS attacks, and define compound unique indexes on user-scoped collections such as `CourseProgress({ user_id, course_id })`.',
                code_example:
                  'const safe = input.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");',
                key_takeaways: [
                  'Always escape regex search strings and index foreign keys.',
                ],
              },
            ],
          },
        ],
      },
      {
        slug: 'sql-database-management',
        title: 'SQL and Database Management',
        subtitle: 'Relational algebra, complex JOINs, indexing performance & ACID transaction design',
        description:
          'Design normalized relational schemas, filter groups accurately, speed queries with B-Tree indexes, and maintain transactional integrity.',
        category: 'SQL',
        difficulty_level: 'beginner',
        estimated_hours: 9,
        is_unlocked: true,
        skill_id: sqlSkill.id,
        skill_ref: sqlSkill._id,
        assessment_id: sqlAsm.id,
        assessment_ref: sqlAsm._id,
        modules: [
          {
            module_id: 'sql-mod-1',
            title: 'Module 1: Filtering, Deduplication & Joins',
            order: 1,
            description: 'Master SQL execution order from FROM/JOIN to WHERE, GROUP BY, and HAVING.',
            lessons: [
              {
                lesson_id: 'sql-l1',
                title: 'WHERE vs HAVING & Aggregate Analytics',
                order: 1,
                duration_minutes: 15,
                content:
                  'SQL evaluates WHERE filters before grouping rows into aggregates, whereas HAVING runs after GROUP BY so you can filter aggregated buckets such as learners averaging over 80%.',
                code_example:
                  'SELECT user_id, AVG(score_achieved) AS avg_score\nFROM assessment_attempts\nGROUP BY user_id\nHAVING AVG(score_achieved) >= 80;',
                key_takeaways: [
                  'Filter raw rows with WHERE and aggregate buckets with HAVING.',
                  'Use SELECT DISTINCT to deduplicate output rows.',
                ],
              },
              {
                lesson_id: 'sql-l2',
                title: 'INNER vs LEFT OUTER JOIN Mechanics',
                order: 2,
                duration_minutes: 18,
                content:
                  'LEFT OUTER JOIN preserves all records from the primary left table and yields NULL for unmatched right-table columns—critical when listing courses alongside optional learner enrollments.',
                code_example:
                  'SELECT c.title, cp.completion_percentage\nFROM courses c\nLEFT JOIN course_progress cp ON cp.course_id = c.id;',
                key_takeaways: [
                  'Use LEFT JOIN whenever unmatched left records must remain visible.',
                ],
              },
            ],
          },
          {
            module_id: 'sql-mod-2',
            title: 'Module 2: Indexing & ACID Transactions',
            order: 2,
            description: 'Scale relational queries and protect multi-step updates.',
            lessons: [
              {
                lesson_id: 'sql-l3',
                title: 'B-Tree Indexing & Query Plans',
                order: 3,
                duration_minutes: 16,
                content:
                  'Without indexes, relational engines perform O(n) sequential table scans. B-Tree indexes support logarithmic O(log n) equality and range scans on frequently filtered columns.',
                code_example:
                  'CREATE INDEX idx_attempts_user_completed ON assessment_attempts(user_id, completed_at);',
                key_takeaways: [
                  'Index high-selectivity columns used in WHERE and JOIN predicates.',
                ],
              },
              {
                lesson_id: 'sql-l4',
                title: 'ACID Atomicity & Rollback Guarantees',
                order: 4,
                duration_minutes: 15,
                content:
                  'Atomic transactions ensure multi-table mutations either commit cleanly together or roll back fully on any mid-flight failure.',
                code_example: 'BEGIN; UPDATE accounts SET balance = balance - 50; COMMIT;',
                key_takeaways: [
                  'Group dependent state updates inside transactions for Atomicity.',
                ],
              },
            ],
          },
        ],
      },
      {
        slug: 'data-science-machine-learning',
        title: 'Data Science and Machine Learning',
        subtitle: 'Data preprocessing, generalization diagnostics, regularization & evaluation metrics',
        description:
          'Build rigorous ML workflows covering train/test leakage prevention, imbalance-aware metrics, bias-variance tradeoff, L2 regularization, and cross-validation.',
        category: 'Data Science',
        difficulty_level: 'intermediate',
        estimated_hours: 12,
        is_unlocked: true,
        skill_id: dsMlSkill.id,
        skill_ref: dsMlSkill._id,
        assessment_id: dsMlAsm.id,
        assessment_ref: dsMlAsm._id,
        modules: [
          {
            module_id: 'ds-mod-1',
            title: 'Module 1: Leakage-Free Feature Pipelines & Metrics',
            order: 1,
            description: 'Avoid validation contamination and evaluate imbalanced predictors accurately.',
            lessons: [
              {
                lesson_id: 'ds-l1',
                title: 'Train/Test Splits & Preventing Data Leakage',
                order: 1,
                duration_minutes: 18,
                content:
                  'Always fit normalization scalers, imputers, and encoders strictly on training folds before calling `.transform()` on validation or test sets so future statistics never leak into training.',
                code_example:
                  'scaler.fit(X_train)\nX_train_scaled = scaler.transform(X_train)\nX_test_scaled = scaler.transform(X_test)',
                key_takeaways: [
                  'Never fit preprocessors on combined train+test data.',
                ],
              },
              {
                lesson_id: 'ds-l2',
                title: 'Precision, Recall & F1 on Imbalanced Datasets',
                order: 2,
                duration_minutes: 18,
                content:
                  'Raw accuracy misleads when class distributions skew heavily (e.g., 99:1). Precision, Recall, F1-score, and PR-AUC faithfully capture rare-event detection quality.',
                code_example:
                  'f1 = 2 * (precision * recall) / (precision + recall)',
                key_takeaways: [
                  'Use F1 and Precision-Recall curves for rare-event detection.',
                ],
              },
            ],
          },
          {
            module_id: 'ds-mod-2',
            title: 'Module 2: Generalization, Regularization & Validation',
            order: 2,
            description: 'Diagnose overfitting and select reliable hyperparameters via k-fold validation.',
            lessons: [
              {
                lesson_id: 'ds-l3',
                title: 'Bias-Variance Tradeoff & L2 Regularization',
                order: 3,
                duration_minutes: 20,
                content:
                  'When training loss drops near zero while validation error stays high, a model exhibits high variance (overfitting). Adding an L2 squared-weight penalty constrains complexity to improve generalization.',
                code_example:
                  'loss = mse_loss(y_true, y_pred) + lambda_reg * np.sum(weights ** 2)',
                key_takeaways: [
                  'Large train/validation gap points to overfitting.',
                  'L2 regularization shrinks excessive weight magnitudes smoothly.',
                ],
              },
              {
                lesson_id: 'ds-l4',
                title: 'K-Fold Cross-Validation Workflows',
                order: 4,
                duration_minutes: 16,
                content:
                  'K-fold cross-validation rotates validation slices across all k partitions, providing stable error bounds across smaller or noisy educational/real-world datasets.',
                code_example: 'mean_cv_score = sum(fold_scores) / len(fold_scores)',
                key_takeaways: [
                  'Average across k folds to reduce evaluation split variance.',
                ],
              },
            ],
          },
        ],
      },
    ];

    const seededCourses = [];
    for (const cSpec of courseSeeds) {
      let existing = await Course.findOne({ slug: cSpec.slug });
      if (!existing) {
        existing = await Course.create(cSpec);
        console.log(`[Seed] Created unlocked course: ${cSpec.title}`);
      } else {
        // Ensure course has up-to-date modules, linked quiz, and remains unlocked by default
        existing.is_unlocked = true;
        if (!existing.modules || existing.modules.length === 0) {
          existing.modules = cSpec.modules;
        }
        if (!existing.assessment_id) {
          existing.assessment_id = cSpec.assessment_id;
          existing.assessment_ref = cSpec.assessment_ref;
        }
        if (!existing.skill_id) {
          existing.skill_id = cSpec.skill_id;
          existing.skill_ref = cSpec.skill_ref;
        }
        await existing.save();
      }
      seededCourses.push(existing);
    }

    // 5. Coding Problems (upsert missing slugs safely)
    const problems = [
      {
        slug: 'reverse-string',
        title: 'Reverse a String',
        description: 'Write a function `reverse_string(s)` that takes a string and returns it reversed.',
        difficulty: 'easy',
        skill_slug: 'python-basics',
        starter_code: 'def reverse_string(s: str) -> str:\n    # Return the reversed string\n    pass\n',
        test_cases_json: [
          { input: '"hello"', expected_output: '"olleh"', is_hidden: false },
          { input: '"skillbridge"', expected_output: '"egdirblliks"', is_hidden: false },
          { input: '""', expected_output: '""', is_hidden: true },
        ],
        hints_json: ['Consider Python slicing syntax s[::-1] or a two-pointer approach.'],
      },
      {
        slug: 'two-sum',
        title: 'Two Sum Problem',
        description: 'Given an array of integers `nums` and integer `target`, return indices of the two numbers such that they add up to target.',
        difficulty: 'easy',
        skill_slug: 'dsa-arrays-strings',
        starter_code: 'def two_sum(nums: list, target: int) -> list:\n    # Return [idx1, idx2]\n    pass\n',
        test_cases_json: [
          { input: 'nums = [2, 7, 11, 15], target = 9', expected_output: '[0, 1]', is_hidden: false },
          { input: 'nums = [3, 2, 4], target = 6', expected_output: '[1, 2]', is_hidden: false },
          { input: 'nums = [3, 3], target = 6', expected_output: '[0, 1]', is_hidden: true },
        ],
        hints_json: ['A hash map can store complement values for O(n) lookup time.'],
      },
      {
        slug: 'valid-parentheses',
        title: 'Valid Parentheses',
        description: 'Given a string containing just `()[]{}` characters, determine if the input string is valid.',
        difficulty: 'medium',
        skill_slug: 'dsa-arrays-strings',
        starter_code: 'def is_valid(s: str) -> bool:\n    # Return True if valid, False otherwise\n    pass\n',
        test_cases_json: [
          { input: '"()"', expected_output: 'True', is_hidden: false },
          { input: '"()[]{}"', expected_output: 'True', is_hidden: false },
          { input: '"(]"', expected_output: 'False', is_hidden: false },
          { input: '"([)]"', expected_output: 'False', is_hidden: true },
        ],
        hints_json: ['Use a Last-In First-Out (LIFO) stack to match closing brackets with recent openings.'],
      },
    ];

    for (const p of problems) {
      const exists = await CodingProblem.findOne({ slug: p.slug });
      if (!exists) {
        await CodingProblem.create(p);
      }
    }

    // 6. Demo Student Sample Progress & Performance (ONLY on demo student account if empty)
    const existingDemoProgCount = await CourseProgress.countDocuments({ user_id: student.id });
    const existingDemoAttemptsCount = await AssessmentAttempt.countDocuments({ user_id: student.id });

    if (existingDemoProgCount === 0 && seededCourses.length >= 4) {
      const pyCourse = seededCourses[0];
      const sqlCourse = seededCourses[3];

      await CourseProgress.create({
        user_id: student.id,
        user_ref: student._id,
        course_id: pyCourse.id,
        course_ref: pyCourse._id,
        unlocked: true,
        is_enrolled: true,
        status: 'in_progress',
        completed_lesson_ids: ['py-l1', 'py-l2'],
        last_lesson_id: 'py-l2',
        completion_percentage: 50,
        enrolled_at: new Date(),
        last_accessed_at: new Date(),
      });

      await CourseProgress.create({
        user_id: student.id,
        user_ref: student._id,
        course_id: sqlCourse.id,
        course_ref: sqlCourse._id,
        unlocked: true,
        is_enrolled: true,
        status: 'completed',
        completed_lesson_ids: ['sql-l1', 'sql-l2', 'sql-l3', 'sql-l4'],
        last_lesson_id: 'sql-l4',
        completion_percentage: 100,
        enrolled_at: new Date(),
        completed_at: new Date(),
        last_accessed_at: new Date(),
      });

      await LearnerActivity.create({
        user_id: student.id,
        activity_type: 'course_completed',
        metadata_json: {
          course_id: sqlCourse.id,
          course_title: sqlCourse.title,
          completion_percentage: 100,
          is_sample_demo: true,
        },
      });
    }

    if (existingDemoAttemptsCount === 0) {
      const sampleQuestions = await Question.find({ assessment_id: pythonAsm.id }).sort({ id: 1 }).limit(5);
      if (sampleQuestions.length > 0) {
        const demoAttempt = await AssessmentAttempt.create({
          assessment_id: pythonAsm.id,
          user_id: student.id,
          score_achieved: 80,
          is_passed: true,
          started_at: new Date(Date.now() - 180000),
          completed_at: new Date(),
        });

        for (let i = 0; i < sampleQuestions.length; i++) {
          const q = sampleQuestions[i];
          const chosen = i < 4 ? q.correct_answer_json : (q.options_json[0] || '');
          await AssessmentResponse.create({
            attempt_id: demoAttempt.id,
            question_id: q.id,
            learner_response_json: chosen,
            is_correct: chosen === q.correct_answer_json,
            time_spent_seconds: 12,
            diagnostic_feedback: chosen === q.correct_answer_json ? 'Correct!' : q.explanation,
          });
        }

        const existingMastery = await SkillMastery.findOne({ user_id: student.id, skill_id: pythonSkill.id });
        if (!existingMastery) {
          await SkillMastery.create({
            user_id: student.id,
            skill_id: pythonSkill.id,
            mastery_score: 0.85,
            confidence_score: 0.8,
            status: 'mastered',
            last_practiced_at: new Date(),
          });
        }
        const existingSqlMastery = await SkillMastery.findOne({ user_id: student.id, skill_id: sqlSkill.id });
        if (!existingSqlMastery) {
          await SkillMastery.create({
            user_id: student.id,
            skill_id: sqlSkill.id,
            mastery_score: 0.9,
            confidence_score: 0.85,
            status: 'mastered',
            last_practiced_at: new Date(),
          });
        }
        const existingJsMastery = await SkillMastery.findOne({ user_id: student.id, skill_id: jsMernSkill.id });
        if (!existingJsMastery) {
          await SkillMastery.create({
            user_id: student.id,
            skill_id: jsMernSkill.id,
            mastery_score: 0.45,
            confidence_score: 0.6,
            status: 'in_progress',
            last_practiced_at: new Date(),
          });
        }
      }
    }

    // 7. Educational RAG Documents
    const docCount = await Document.countDocuments();
    if (docCount === 0) {
      const sampleText =
        'SkillBridge AI Pedagogical Reference Guide.\n\n' +
        'Chapter 1: Foundational Software Engineering Architecture.\n' +
        'Modern educational technology relies on directed acyclic graphs (DAGs) to model concept dependencies. ' +
        'Learners must demonstrate baseline competency in foundational nodes before unlocking advanced dependent topics. ' +
        'Assessments evaluate deep cognitive understanding rather than superficial memorization.\n\n' +
        'Chapter 2: Retrieval-Augmented Generation (RAG) Security.\n' +
        'When retrieving context documents for LLM synthesis, platforms must implement strict boundary isolation. ' +
        'Indirect prompt injection occurs when malicious instructions embedded inside untrusted documents attempt to ' +
        'override the primary system instructions. Defenses include sliding-window context sandboxing, deterministic ' +
        'citation verification, and prompt guardrails.';

      await RAGService.uploadAndIndexDocument(
        admin.id,
        'Foundational Software Engineering Architecture & RAG Guide',
        'software_architecture_guide.txt',
        Buffer.from(sampleText, 'utf-8'),
        true
      );
      console.log('[Seed] Uploaded and indexed foundational educational RAG document.');
    }

    // 8. Sample Feedback
    const fbCount = await Feedback.countDocuments();
    if (fbCount === 0) {
      await Feedback.create({
        user_id: student.id,
        category: 'suggestion',
        title: 'Interactive Diagram Enhancements',
        message: 'It would be fantastic to have zoomable DAG visualization in the skill taxonomy view.',
        status: 'reviewed',
        admin_notes: 'Planned for React frontend upgrade in Phase 4.',
      });
      console.log('[Seed] Created sample feedback item.');
    }

    console.log('[Seed] Seeding completed successfully!');
  } catch (err) {
    console.error('[Seed Error]:', err);
  } finally {
    if (disconnectAfter) {
      await disconnectDB();
    }
  }
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('seed_mongo.js')) {
  seedMongoDatabase();
}

export default seedMongoDatabase;
