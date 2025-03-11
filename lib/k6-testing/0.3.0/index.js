// assert.ts
import exec from "k6/execution";
function assert(condition, message, soft) {
  if (condition) return;
  if (soft) {
    throw new AssertionFailedError(message);
  } else {
    exec.test.abort(message);
  }
}
var AssertionFailedError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "AssertionFailedError";
  }
};

// environment.ts
function getEnvironment() {
  if (typeof Deno !== "undefined") {
    return Deno.env.toObject();
  }
  return __ENV;
}
var env = getEnvironment();
var envParser = {
  /**
   * Check if an environment variable is set
   */
  hasValue(key) {
    return env[key] !== void 0;
  },
  /**
   * Parse a boolean environment variable
   * "false" (case insensitive) -> false
   * anything else -> true
   * @throws if value is undefined
   */
  boolean(key) {
    const value = env[key]?.toLowerCase();
    if (value === void 0) {
      throw new Error(`Environment variable ${key} is not set`);
    }
    return value !== "false";
  },
  /**
   * Parse an environment variable that should match specific values
   * @throws if value is undefined or doesn't match allowed values
   */
  enum(key, allowedValues) {
    const value = env[key]?.toLowerCase();
    if (value === void 0) {
      throw new Error(`Environment variable ${key} is not set`);
    }
    if (!allowedValues.includes(value)) {
      throw new Error(
        `Invalid value for ${key}. Must be one of: ${allowedValues.join(", ")}`
      );
    }
    return value;
  },
  /**
   * Parses an environment variable as a non-negative number.
   * @param name The name of the environment variable
   * @throws Error if the value is not a valid non-negative number
   * @returns The parsed number value
   */
  number(name) {
    const value = env[name];
    if (!value) {
      throw new Error(`Environment variable ${name} is not set`);
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
      throw new Error(
        `Environment variable ${name} must be a valid number, got: ${value}`
      );
    }
    if (parsed < 0) {
      throw new Error(
        `Environment variable ${name} must be a non-negative number, got: ${value}`
      );
    }
    return parsed;
  }
};

// config.ts
var DEFAULT_RETRY_OPTIONS = {
  // 5 seconds default timeout
  timeout: 5e3,
  // 100ms between retries
  interval: 100
};
var DEFAULT_CONFIG = {
  ...DEFAULT_RETRY_OPTIONS,
  soft: false,
  colorize: true,
  display: "pretty",
  assertFn: assert
};
var ConfigLoader = class _ConfigLoader {
  /**
   * Loads configuration with the following precedence (highest to lowest):
   * 1. Environment variables
   * 2. Explicit configuration passed to the function
   * 3. Default values
   */
  static load(explicitConfig = {}) {
    const envConfig = _ConfigLoader.loadFromEnv();
    return {
      ...DEFAULT_CONFIG,
      ...explicitConfig,
      ...envConfig
    };
  }
  /**
   * Loads configuration from environment variables
   * Returns only the values that are explicitly set in the environment
   */
  static loadFromEnv() {
    const config = {};
    if (envParser.hasValue("K6_TESTING_COLORIZE")) {
      config.colorize = envParser.boolean("K6_TESTING_COLORIZE");
    }
    if (envParser.hasValue("K6_TESTING_DISPLAY")) {
      config.display = envParser.enum(
        "K6_TESTING_DISPLAY",
        ["inline", "pretty"]
      );
    }
    if (envParser.hasValue("K6_TESTING_TIMEOUT")) {
      config.timeout = envParser.number("K6_TESTING_TIMEOUT");
    }
    if (envParser.hasValue("K6_TESTING_INTERVAL")) {
      config.interval = envParser.number("K6_TESTING_INTERVAL");
    }
    return config;
  }
};

// execution.ts
function captureExecutionContext(st) {
  if (!st || st.length <= 1) {
    return void 0;
  }
  const stackFrame = st[st.length - 1];
  const filePath = stackFrame.filePath;
  const fileName = stackFrame.fileName;
  const lineNumber = stackFrame.lineNumber;
  const columnNumber = stackFrame.columnNumber;
  const at = `${filePath}:${lineNumber}:${columnNumber}`;
  return {
    filePath,
    fileName,
    lineNumber,
    columnNumber,
    at
  };
}

// stacktrace.ts
function parseStackTrace(stack) {
  if (!stack) return [];
  const lines = stack.split("\n");
  const frames = [];
  for (let i = 0; i < lines.length; i++) {
    let lineStr = lines[i].trim();
    if (i === 0 && lineStr.startsWith("Error")) continue;
    if (!lineStr.startsWith("at ")) continue;
    lineStr = lineStr.slice(3).trim();
    let functionName = "<anonymous>";
    let fileInfo = lineStr;
    const firstParenIndex = lineStr.indexOf("(");
    const fileProtocolIndex = lineStr.indexOf("file://");
    if (fileProtocolIndex === 0) {
      functionName = "<anonymous>";
      fileInfo = lineStr.slice(fileProtocolIndex);
    } else if (firstParenIndex >= 0) {
      functionName = lineStr.slice(0, firstParenIndex).trim() || "<anonymous>";
      fileInfo = lineStr.slice(firstParenIndex + 1, lineStr.lastIndexOf(")")).trim();
    } else {
      fileInfo = lineStr;
    }
    const offsetParenIndex = fileInfo.lastIndexOf("(");
    if (offsetParenIndex >= 0) {
      fileInfo = fileInfo.slice(0, offsetParenIndex);
    }
    if (fileInfo.startsWith("file://")) {
      fileInfo = fileInfo.slice(7);
    }
    const lastColon = fileInfo.lastIndexOf(":");
    if (lastColon === -1) continue;
    const secondLastColon = fileInfo.lastIndexOf(":", lastColon - 1);
    if (secondLastColon === -1) continue;
    const filePath = fileInfo.slice(0, secondLastColon);
    const fileName = filePath.split("/").pop() ?? "";
    const lineNumberStr = fileInfo.slice(secondLastColon + 1, lastColon);
    const columnNumberStr = fileInfo.slice(lastColon + 1);
    frames.push({
      functionName,
      filePath,
      fileName,
      lineNumber: parseInt(lineNumberStr, 10),
      columnNumber: parseInt(columnNumberStr, 10)
    });
  }
  return frames;
}

// colors.ts
var ANSI_COLORS = {
  reset: "\x1B[0m",
  // Standard Colors
  black: "\x1B[30m",
  red: "\x1B[31m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  blue: "\x1B[34m",
  magenta: "\x1B[35m",
  cyan: "\x1B[36m",
  white: "\x1B[37m",
  // Bright Colors
  brightBlack: "\x1B[90m",
  brightRed: "\x1B[91m",
  brightGreen: "\x1B[92m",
  brightYellow: "\x1B[93m",
  brightBlue: "\x1B[94m",
  brightMagenta: "\x1B[95m",
  brightCyan: "\x1B[96m",
  brightWhite: "\x1B[97m",
  // Dark Colors
  darkGrey: "\x1B[90m"
};
function colorize(text, color) {
  return `${ANSI_COLORS[color]}${text}${ANSI_COLORS.reset}`;
}

// render.ts
var MatcherErrorRendererRegistry = class {
  static renderers = /* @__PURE__ */ new Map();
  static config = { colorize: true, display: "pretty" };
  static register(matcherName, renderer) {
    this.renderers.set(matcherName, renderer);
  }
  static getRenderer(matcherName) {
    return this.renderers.get(matcherName) || new DefaultMatcherErrorRenderer();
  }
  static configure(config) {
    this.config = { ...this.config, ...config };
  }
  static getConfig() {
    return this.config;
  }
};
var BaseMatcherErrorRenderer = class {
  getReceivedPlaceholder() {
    return "received";
  }
  getExpectedPlaceholder() {
    return "expected";
  }
  renderErrorLine(info, config) {
    const maybeColorize = (text, color) => config.colorize ? colorize(text, color) : text;
    if ("customMessage" in info && typeof info.customMessage === "string") {
      return maybeColorize(info.customMessage, "white");
    }
    return maybeColorize(`expect(`, "darkGrey") + maybeColorize(this.getReceivedPlaceholder(), "red") + maybeColorize(`).`, "darkGrey") + maybeColorize(this.getMatcherName(), "white") + this.renderMatcherArgs(maybeColorize);
  }
  renderMatcherArgs(maybeColorize) {
    return maybeColorize(`()`, "darkGrey");
  }
  render(info, config) {
    const maybeColorize = (text, color) => config.colorize ? colorize(text, color) : text;
    const lines = [
      { label: "Error", value: this.renderErrorLine(info, config), group: 1 },
      {
        label: "At",
        value: maybeColorize(
          info.executionContext.at || "unknown location",
          "darkGrey"
        ),
        group: 1
      },
      ...this.getSpecificLines(info, maybeColorize),
      {
        label: "Filename",
        value: maybeColorize(info.executionContext.fileName, "darkGrey"),
        group: 99
      },
      {
        label: "Line",
        value: maybeColorize(
          info.executionContext.lineNumber.toString(),
          "darkGrey"
        ),
        group: 99
      }
    ];
    return DisplayFormatRegistry.getFormatter(config.display).renderLines(
      lines
    );
  }
};
var ReceivedOnlyMatcherRenderer = class extends BaseMatcherErrorRenderer {
  getSpecificLines(info, maybeColorize) {
    return [
      {
        label: "Received",
        value: maybeColorize(info.received, "red"),
        group: 2
      }
    ];
  }
};
var ExpectedReceivedMatcherRenderer = class extends BaseMatcherErrorRenderer {
  getSpecificLines(info, maybeColorize) {
    return [
      {
        label: "Expected",
        value: maybeColorize(info.expected, "green"),
        group: 2
      },
      {
        label: "Received",
        value: maybeColorize(info.received, "red"),
        group: 2
      }
    ];
  }
  renderMatcherArgs(maybeColorize) {
    return maybeColorize(`(`, "darkGrey") + maybeColorize(this.getExpectedPlaceholder(), "green") + maybeColorize(`)`, "darkGrey");
  }
};
var DefaultMatcherErrorRenderer = class {
  render(info, config) {
    const maybeColorize = (text, color) => config.colorize ? colorize(text, color) : text;
    const lines = [
      { label: "Error", value: this.renderErrorLine(info, config), group: 1 },
      {
        label: "At",
        value: maybeColorize(
          info.executionContext.at || "unknown location",
          "darkGrey"
        ),
        group: 1
      },
      {
        label: "Expected",
        value: maybeColorize(info.expected, "green"),
        group: 2
      },
      {
        label: "Received",
        value: maybeColorize(info.received, "red"),
        group: 2
      },
      {
        label: "Filename",
        value: maybeColorize(info.executionContext.fileName, "darkGrey"),
        group: 3
      },
      {
        label: "Line",
        value: maybeColorize(
          info.executionContext.lineNumber.toString(),
          "darkGrey"
        ),
        group: 3
      }
    ];
    return DisplayFormatRegistry.getFormatter(config.display).renderLines(
      lines
    );
  }
  renderErrorLine(info, config) {
    const maybeColorize = (text, color) => config.colorize ? colorize(text, color) : text;
    return maybeColorize(`expect(`, "darkGrey") + maybeColorize(`received`, "red") + maybeColorize(`).`, "darkGrey") + maybeColorize(`${info.matcherName}`, "white") + maybeColorize(`(`, "darkGrey") + maybeColorize(`expected`, "green") + maybeColorize(`)`, "darkGrey");
  }
};
var PrettyFormatRenderer = class {
  renderLines(lines) {
    const maxLabelWidth = Math.max(
      ...lines.filter((line) => !line.raw).map(({ label }) => (label + ":").length)
    );
    return "\n\n" + lines.map(({ label, value, raw }, index) => {
      let line;
      if (raw) {
        line = value;
      } else {
        const labelWithColon = label + ":";
        const spaces = " ".repeat(maxLabelWidth - labelWithColon.length);
        line = spaces + labelWithColon + " " + value;
      }
      const nextLine = lines[index + 1];
      if (nextLine && lines[index].group !== nextLine.group) {
        return line + "\n";
      }
      return line;
    }).join("\n") + "\n\n";
  }
};
var InlineFormatRenderer = class {
  renderLines(lines) {
    return lines.map(({ label, value }) => {
      const escapedValue = typeof value === "string" ? value.includes(" ") ? `"${value}"` : value : value;
      const escapedLabel = label.toLowerCase().replace(/\s+/g, "_");
      return `${escapedLabel}=${escapedValue}`;
    }).join(" ");
  }
};
var DisplayFormatRegistry = class {
  static formatters = /* @__PURE__ */ new Map([
    ["pretty", new PrettyFormatRenderer()],
    ["inline", new InlineFormatRenderer()]
  ]);
  static getFormatter(format) {
    const formatter = this.formatters.get(format);
    if (!formatter) {
      throw new Error(`Unknown display format: ${format}`);
    }
    return formatter;
  }
};

// expectNonRetrying.ts
function createExpectation(received, config, message, isNegated = false) {
  const usedAssert = config.assertFn ?? assert;
  MatcherErrorRendererRegistry.configure({
    colorize: config.colorize,
    display: config.display
  });
  MatcherErrorRendererRegistry.register(
    "toBe",
    new DefaultMatcherErrorRenderer()
  );
  MatcherErrorRendererRegistry.register(
    "toBeCloseTo",
    new ToBeCloseToErrorRenderer()
  );
  MatcherErrorRendererRegistry.register(
    "toBeDefined",
    new ToBeDefinedErrorRenderer()
  );
  MatcherErrorRendererRegistry.register(
    "toBeFalsy",
    new ToBeFalsyErrorRenderer()
  );
  MatcherErrorRendererRegistry.register(
    "toBeGreaterThan",
    new ToBeGreaterThanErrorRenderer()
  );
  MatcherErrorRendererRegistry.register(
    "toBeGreaterThanOrEqual",
    new ToBeGreaterThanOrEqualErrorRenderer()
  );
  MatcherErrorRendererRegistry.register(
    "toBeInstanceOf",
    new ToBeInstanceOfErrorRenderer()
  );
  MatcherErrorRendererRegistry.register(
    "toBeLessThan",
    new ToBeLessThanErrorRenderer()
  );
  MatcherErrorRendererRegistry.register(
    "toBeLessThanOrEqual",
    new ToBeLessThanOrEqualErrorRenderer()
  );
  MatcherErrorRendererRegistry.register("toBeNaN", new ToBeNaNErrorRenderer());
  MatcherErrorRendererRegistry.register(
    "toBeNull",
    new ToBeNullErrorRenderer()
  );
  MatcherErrorRendererRegistry.register(
    "toBeTruthy",
    new ToBeTruthyErrorRenderer()
  );
  MatcherErrorRendererRegistry.register(
    "toBeUndefined",
    new ToBeUndefinedErrorRenderer()
  );
  MatcherErrorRendererRegistry.register("toEqual", new ToEqualErrorRenderer());
  MatcherErrorRendererRegistry.register(
    "toHaveLength",
    new ToHaveLengthErrorRenderer()
  );
  MatcherErrorRendererRegistry.register(
    "toContain",
    new ToContainErrorRenderer()
  );
  MatcherErrorRendererRegistry.register(
    "toContainEqual",
    new ToContainEqualErrorRenderer()
  );
  MatcherErrorRendererRegistry.register(
    "toHaveProperty",
    new ToHavePropertyErrorRenderer()
  );
  const matcherConfig = {
    usedAssert,
    isSoft: config.soft,
    isNegated,
    message
  };
  const expectation = {
    get not() {
      return createExpectation(received, config, message, !isNegated);
    },
    toBe(expected) {
      createMatcher(
        "toBe",
        () => Object.is(received, expected),
        expected,
        received,
        matcherConfig
      );
    },
    toBeCloseTo(expected, precision = 2) {
      const tolerance = Math.pow(10, -precision) * Math.max(Math.abs(received), Math.abs(expected));
      const diff = Math.abs(received - expected);
      createMatcher(
        "toBeCloseTo",
        () => diff < tolerance,
        expected,
        received,
        {
          ...matcherConfig,
          matcherSpecific: {
            precision,
            difference: diff,
            expectedDifference: tolerance
          }
        }
      );
    },
    toBeDefined() {
      createMatcher(
        "toBeDefined",
        () => received !== void 0,
        "defined",
        JSON.stringify(received),
        matcherConfig
      );
    },
    toBeFalsy() {
      createMatcher(
        "toBeFalsy",
        () => !received,
        "falsy",
        JSON.stringify(received),
        matcherConfig
      );
    },
    toBeGreaterThan(expected) {
      createMatcher(
        "toBeGreaterThan",
        () => received > expected,
        expected,
        received,
        matcherConfig
      );
    },
    toBeGreaterThanOrEqual(expected) {
      createMatcher(
        "toBeGreaterThanOrEqual",
        () => received >= expected,
        expected,
        received,
        matcherConfig
      );
    },
    // deno-lint-ignore ban-types
    toBeInstanceOf(expected) {
      createMatcher(
        "toBeInstanceOf",
        () => received instanceof expected,
        expected.name,
        received.constructor.name,
        matcherConfig
      );
    },
    toBeLessThan(expected) {
      createMatcher(
        "toBeLessThan",
        () => received < expected,
        expected,
        received,
        matcherConfig
      );
    },
    toBeLessThanOrEqual(expected) {
      createMatcher(
        "toBeLessThanOrEqual",
        () => received <= expected,
        expected,
        received,
        matcherConfig
      );
    },
    toBeNaN() {
      createMatcher(
        "toBeNaN",
        () => isNaN(received),
        "NaN",
        JSON.stringify(received),
        matcherConfig
      );
    },
    toBeNull() {
      createMatcher(
        "toBeNull",
        () => received === null,
        "null",
        JSON.stringify(received),
        matcherConfig
      );
    },
    toBeTruthy() {
      createMatcher(
        "toBeTruthy",
        () => !!received,
        "truthy",
        JSON.stringify(received),
        matcherConfig
      );
    },
    toBeUndefined() {
      createMatcher(
        "toBeUndefined",
        () => received === void 0,
        "undefined",
        JSON.stringify(received),
        matcherConfig
      );
    },
    toEqual(expected) {
      createMatcher(
        "toEqual",
        () => isDeepEqual(received, expected),
        JSON.stringify(expected),
        JSON.stringify(received),
        matcherConfig
      );
    },
    toHaveLength(expected) {
      createMatcher(
        "toHaveLength",
        () => received.length === expected,
        expected.toString(),
        received.length.toString(),
        matcherConfig
      );
    },
    toContain(expected) {
      let receivedType = "";
      if (typeof received === "string") {
        receivedType = "string";
      } else if (Array.isArray(received)) {
        receivedType = "array";
      } else if (received instanceof Set) {
        receivedType = "set";
      } else {
        throw new Error(
          "toContain is only supported for strings, arrays, and sets"
        );
      }
      createMatcher(
        "toContain",
        () => {
          if (typeof received === "string") {
            return received.includes(expected);
          } else if (Array.isArray(received)) {
            return received.includes(expected);
          } else if (received instanceof Set) {
            return Array.from(received).includes(expected);
          } else {
            throw new Error(
              "toContain is only supported for strings, arrays, and sets"
            );
          }
        },
        expected,
        received,
        {
          ...matcherConfig,
          matcherSpecific: {
            receivedType
          }
        }
      );
    },
    toContainEqual(expected) {
      let receivedType = "";
      if (Array.isArray(received)) {
        receivedType = "array";
      } else if (received instanceof Set) {
        receivedType = "set";
      } else {
        throw new Error(
          "toContainEqual is only supported for arrays and sets"
        );
      }
      createMatcher(
        "toContainEqual",
        () => {
          if (Array.isArray(received)) {
            return received.some((item) => isDeepEqual(item, expected));
          } else if (received instanceof Set) {
            return Array.from(received).some(
              (item) => isDeepEqual(item, expected)
            );
          } else {
            throw new Error(
              "toContainEqual is only supported for arrays and sets"
            );
          }
        },
        expected,
        received,
        {
          ...matcherConfig,
          matcherSpecific: {
            receivedType
          }
        }
      );
    },
    toHaveProperty(keyPath, expected) {
      if (typeof received !== "object" || received === null) {
        throw new Error(
          "toHaveProperty is only supported for objects"
        );
      }
      const hasProperty = () => {
        try {
          const value = getPropertyByPath(
            received,
            keyPath
          );
          return expected !== void 0 ? isDeepEqual(value, expected) : true;
        } catch (_) {
          return false;
        }
      };
      createMatcher(
        "toHaveProperty",
        hasProperty,
        expected !== void 0 ? expected : keyPath,
        received,
        {
          ...matcherConfig,
          matcherSpecific: {
            keyPath,
            hasExpectedValue: expected !== void 0
          }
        }
      );
    }
  };
  return expectation;
}
function createMatcher(matcherName, checkFn, expected, received, {
  usedAssert,
  isSoft,
  isNegated = false,
  matcherSpecific = {},
  message
}) {
  const info = createMatcherInfo(
    matcherName,
    expected,
    received,
    { ...matcherSpecific, isNegated },
    message
  );
  const result = checkFn();
  const finalResult = isNegated ? !result : result;
  usedAssert(
    finalResult,
    MatcherErrorRendererRegistry.getRenderer(matcherName).render(
      info,
      MatcherErrorRendererRegistry.getConfig()
    ),
    isSoft
  );
}
function createMatcherInfo(matcherName, expected, received, matcherSpecific = {}, customMessage) {
  const stacktrace = parseStackTrace(new Error().stack);
  const executionContext = captureExecutionContext(stacktrace);
  if (!executionContext) {
    throw new Error("k6 failed to capture execution context");
  }
  return {
    executionContext,
    matcherName,
    expected: typeof expected === "string" ? expected : JSON.stringify(expected),
    received: JSON.stringify(received),
    matcherSpecific,
    customMessage
  };
}
var ToBeCloseToErrorRenderer = class extends ExpectedReceivedMatcherRenderer {
  getMatcherName() {
    return "toBeCloseTo";
  }
  getSpecificLines(info, maybeColorize) {
    const matcherInfo = info.matcherSpecific;
    return [
      {
        label: "Expected precision",
        value: maybeColorize(matcherInfo.precision.toString(), "green"),
        group: 3
      },
      {
        label: "Expected difference",
        value: "< " + maybeColorize(`${matcherInfo.expectedDifference}`, "green"),
        group: 3
      },
      {
        label: "Received difference",
        value: maybeColorize(matcherInfo.difference.toString(), "red"),
        group: 3
      }
    ];
  }
  renderMatcherArgs(maybeColorize) {
    return maybeColorize(`(`, "darkGrey") + maybeColorize(`expected`, "green") + maybeColorize(`, `, "darkGrey") + maybeColorize(`precision`, "white") + maybeColorize(`)`, "darkGrey");
  }
};
var ToBeDefinedErrorRenderer = class extends ReceivedOnlyMatcherRenderer {
  getMatcherName() {
    return "toBeDefined";
  }
};
var ToBeFalsyErrorRenderer = class extends ReceivedOnlyMatcherRenderer {
  getMatcherName() {
    return "toBeFalsy";
  }
};
var ToBeGreaterThanErrorRenderer = class extends ExpectedReceivedMatcherRenderer {
  getMatcherName() {
    return "toBeGreaterThan";
  }
  getSpecificLines(info, maybeColorize) {
    return [
      {
        label: "Expected",
        value: "> " + maybeColorize(info.expected, "green"),
        group: 3
      },
      {
        label: "Received",
        value: maybeColorize(info.received, "red"),
        group: 3
      }
    ];
  }
};
var ToBeGreaterThanOrEqualErrorRenderer = class extends ExpectedReceivedMatcherRenderer {
  getMatcherName() {
    return "toBeGreaterThanOrEqual";
  }
  getSpecificLines(info, maybeColorize) {
    return [
      {
        label: "Expected",
        value: ">= " + maybeColorize(info.expected, "green"),
        group: 3
      },
      {
        label: "Received",
        value: maybeColorize(info.received, "red"),
        group: 3
      }
    ];
  }
};
var ToBeInstanceOfErrorRenderer = class extends ExpectedReceivedMatcherRenderer {
  getMatcherName() {
    return "toBeInstanceOf";
  }
  getSpecificLines(info, maybeColorize) {
    return [
      {
        label: "Expected constructor",
        value: maybeColorize(info.expected, "green"),
        group: 3
      },
      {
        label: "Received constructor",
        value: maybeColorize(info.received, "red"),
        group: 3
      }
    ];
  }
};
var ToBeLessThanErrorRenderer = class extends ExpectedReceivedMatcherRenderer {
  getMatcherName() {
    return "toBeLessThan";
  }
  getSpecificLines(info, maybeColorize) {
    return [
      {
        label: "Expected",
        value: "< " + maybeColorize(info.expected, "green"),
        group: 3
      },
      {
        label: "Received",
        value: maybeColorize(info.received, "red"),
        group: 3
      }
    ];
  }
};
var ToBeLessThanOrEqualErrorRenderer = class extends ExpectedReceivedMatcherRenderer {
  getMatcherName() {
    return "toBeLessThanOrEqual";
  }
  getSpecificLines(info, maybeColorize) {
    return [
      {
        label: "Expected",
        value: "<= " + maybeColorize(info.expected, "green"),
        group: 3
      },
      {
        label: "Received",
        value: maybeColorize(info.received, "red"),
        group: 3
      }
    ];
  }
};
var ToBeNaNErrorRenderer = class extends ReceivedOnlyMatcherRenderer {
  getMatcherName() {
    return "toBeNaN";
  }
};
var ToBeNullErrorRenderer = class extends ReceivedOnlyMatcherRenderer {
  getMatcherName() {
    return "toBeNull";
  }
};
var ToBeTruthyErrorRenderer = class extends ReceivedOnlyMatcherRenderer {
  getMatcherName() {
    return "toBeTruthy";
  }
};
var ToBeUndefinedErrorRenderer = class extends ReceivedOnlyMatcherRenderer {
  getMatcherName() {
    return "toBeUndefined";
  }
};
var ToEqualErrorRenderer = class extends ExpectedReceivedMatcherRenderer {
  getMatcherName() {
    return "toEqual";
  }
  getSpecificLines(info, maybeColorize) {
    return [
      {
        label: "Expected",
        value: maybeColorize(info.expected, "green"),
        group: 3
      },
      {
        label: "Received",
        value: maybeColorize(info.received, "red"),
        group: 3
      }
    ];
  }
};
var ToHaveLengthErrorRenderer = class extends ExpectedReceivedMatcherRenderer {
  getMatcherName() {
    return "toHaveLength";
  }
  getSpecificLines(info, maybeColorize) {
    return [
      {
        label: "Expected length",
        value: maybeColorize(info.expected, "green"),
        group: 3
      },
      {
        label: "Received length",
        value: maybeColorize(info.received, "red"),
        group: 3
      },
      {
        label: "Received array",
        value: maybeColorize(
          info.matcherSpecific?.receivedArray,
          "red"
        ),
        group: 3
      }
    ];
  }
};
var ToContainErrorRenderer = class extends ExpectedReceivedMatcherRenderer {
  getMatcherName() {
    return "toContain";
  }
  getSpecificLines(info, maybeColorize) {
    const isNegated = info.matcherSpecific?.isNegated;
    const receivedType = typeof info.matcherSpecific?.receivedType === "string" ? info.matcherSpecific?.receivedType : Array.isArray(JSON.parse(info.received)) ? "array" : "string";
    return [
      {
        label: isNegated ? "Expected not to contain" : "Expected to contain",
        value: maybeColorize(info.expected, "green"),
        group: 3
      },
      {
        label: `Received ${receivedType}`,
        value: maybeColorize(info.received, "red"),
        group: 3
      }
    ];
  }
};
var ToContainEqualErrorRenderer = class extends ExpectedReceivedMatcherRenderer {
  getMatcherName() {
    return "toContainEqual";
  }
  getSpecificLines(info, maybeColorize) {
    const isNegated = info.matcherSpecific?.isNegated;
    const receivedType = info.matcherSpecific?.receivedType;
    return [
      {
        label: isNegated ? "Expected not to contain equal" : "Expected to contain equal",
        value: maybeColorize(info.expected, "green"),
        group: 3
      },
      {
        label: `Received ${receivedType}`,
        value: maybeColorize(info.received, "red"),
        group: 3
      }
    ];
  }
};
var ToHavePropertyErrorRenderer = class extends ExpectedReceivedMatcherRenderer {
  getMatcherName() {
    return "toHaveProperty";
  }
  getSpecificLines(info, maybeColorize) {
    const isNegated = info.matcherSpecific?.isNegated;
    const keyPath = info.matcherSpecific?.keyPath;
    const hasExpectedValue = info.matcherSpecific?.hasExpectedValue;
    const lines = [
      {
        label: "Property path",
        value: maybeColorize(keyPath, "white"),
        group: 3
      }
    ];
    if (hasExpectedValue) {
      lines.push(
        {
          label: isNegated ? "Expected property not to equal" : "Expected property to equal",
          value: maybeColorize(info.expected, "green"),
          group: 3
        }
      );
    } else {
      lines.push(
        {
          label: isNegated ? "Expected property not to exist" : "Expected property to exist",
          value: "",
          group: 3
        }
      );
    }
    lines.push(
      {
        label: "Received object",
        value: maybeColorize(info.received, "red"),
        group: 3
      }
    );
    return lines;
  }
  renderMatcherArgs(maybeColorize) {
    return maybeColorize(`(`, "darkGrey") + maybeColorize(`keyPath`, "white") + maybeColorize(`, `, "darkGrey") + maybeColorize(`expected?`, "green") + maybeColorize(`)`, "darkGrey");
  }
};
function isDeepEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => {
    return keysB.includes(key) && isDeepEqual(
      a[key],
      b[key]
    );
  });
}
function getPropertyByPath(obj, path) {
  if (path === "") {
    throw new Error("Invalid path: empty string");
  }
  const segments = [];
  let currentSegment = "";
  let inBrackets = false;
  for (let i = 0; i < path.length; i++) {
    const char = path[i];
    if (char === "." && !inBrackets) {
      if (currentSegment) {
        segments.push(currentSegment);
        currentSegment = "";
      }
    } else if (char === "[") {
      if (currentSegment) {
        segments.push(currentSegment);
        currentSegment = "";
      }
      inBrackets = true;
    } else if (char === "]") {
      if (inBrackets) {
        segments.push(currentSegment);
        currentSegment = "";
        inBrackets = false;
      } else {
        throw new Error(`Invalid path: ${path}`);
      }
    } else {
      currentSegment += char;
    }
  }
  if (currentSegment) {
    segments.push(currentSegment);
  }
  let current = obj;
  for (const segment of segments) {
    if (current === null || current === void 0) {
      throw new Error(`Property ${path} does not exist`);
    }
    if (typeof segment === "string" && !isNaN(Number(segment))) {
      const index = Number(segment);
      if (!Array.isArray(current)) {
        throw new Error(`Cannot access index ${segment} of non-array`);
      }
      if (index >= current.length) {
        throw new Error(`Index ${segment} out of bounds`);
      }
      current = current[index];
    } else {
      if (typeof current !== "object") {
        throw new Error(`Cannot access property ${segment} of non-object`);
      }
      if (!Object.prototype.hasOwnProperty.call(current, segment)) {
        throw new Error(`Property ${segment} does not exist on object`);
      }
      current = current[segment];
    }
  }
  return current;
}

// expectRetrying.ts
function createExpectation2(locator, config, message, isNegated = false) {
  const usedAssert = config.assertFn ?? assert;
  const isSoft = config.soft ?? false;
  const retryConfig = {
    timeout: config.timeout,
    interval: config.interval
  };
  MatcherErrorRendererRegistry.configure({
    colorize: config.colorize,
    display: config.display
  });
  MatcherErrorRendererRegistry.register(
    "toBeChecked",
    new ToBeCheckedErrorRenderer()
  );
  MatcherErrorRendererRegistry.register(
    "toBeDisabled",
    new ToBeDisabledErrorRenderer()
  );
  MatcherErrorRendererRegistry.register(
    "toBeEditable",
    new ToBeEditableErrorRenderer()
  );
  MatcherErrorRendererRegistry.register(
    "toBeEnabled",
    new ToBeEnabledErrorRenderer()
  );
  MatcherErrorRendererRegistry.register(
    "toBeHidden",
    new ToBeHiddenErrorRenderer()
  );
  MatcherErrorRendererRegistry.register(
    "toBeVisible",
    new ToBeVisibleErrorRenderer()
  );
  MatcherErrorRendererRegistry.register(
    "toHaveValue",
    new ToHaveValueErrorRenderer()
  );
  const matcherConfig = {
    locator,
    retryConfig,
    usedAssert,
    isSoft,
    isNegated,
    message
  };
  const expectation = {
    get not() {
      return createExpectation2(locator, config, message, !isNegated);
    },
    async toBeChecked(options = retryConfig) {
      await createMatcher2(
        "toBeChecked",
        async () => await locator.isChecked(),
        "checked",
        "unchecked",
        { ...matcherConfig, options }
      );
    },
    async toBeDisabled(options = retryConfig) {
      await createMatcher2(
        "toBeDisabled",
        async () => await locator.isDisabled(),
        "disabled",
        "enabled",
        { ...matcherConfig, options }
      );
    },
    async toBeEditable(options = retryConfig) {
      await createMatcher2(
        "toBeEditable",
        async () => await locator.isEditable(),
        "editable",
        "uneditable",
        { ...matcherConfig, options }
      );
    },
    async toBeEnabled(options = retryConfig) {
      await createMatcher2(
        "toBeEnabled",
        async () => await locator.isEnabled(),
        "enabled",
        "disabled",
        { ...matcherConfig, options }
      );
    },
    async toBeHidden(options = retryConfig) {
      await createMatcher2(
        "toBeHidden",
        async () => await locator.isHidden(),
        "hidden",
        "visible",
        { ...matcherConfig, options }
      );
    },
    async toBeVisible(options = retryConfig) {
      await createMatcher2(
        "toBeVisible",
        async () => await locator.isVisible(),
        "visible",
        "hidden",
        { ...matcherConfig, options }
      );
    },
    async toHaveValue(expectedValue, options = retryConfig) {
      const stacktrace = parseStackTrace(new Error().stack);
      const executionContext = captureExecutionContext(stacktrace);
      if (!executionContext) {
        throw new Error("k6 failed to capture execution context");
      }
      const info = {
        executionContext,
        matcherName: "toHaveValue",
        expected: expectedValue,
        received: "unknown",
        matcherSpecific: { isNegated },
        customMessage: message
      };
      try {
        await withRetry(async () => {
          const actualValue = await locator.inputValue();
          const result = expectedValue === actualValue;
          const finalResult = isNegated ? !result : result;
          usedAssert(
            finalResult,
            MatcherErrorRendererRegistry.getRenderer("toHaveValue").render(
              info,
              MatcherErrorRendererRegistry.getConfig()
            ),
            isSoft
          );
        }, { ...retryConfig, ...options });
      } catch (_) {
        usedAssert(
          false,
          MatcherErrorRendererRegistry.getRenderer("toHaveValue").render(
            info,
            MatcherErrorRendererRegistry.getConfig()
          ),
          isSoft
        );
      }
    }
  };
  return expectation;
}
function createMatcherInfo2(matcherName, expected, received, additionalInfo = {}, customMessage) {
  const stacktrace = parseStackTrace(new Error().stack);
  const executionContext = captureExecutionContext(stacktrace);
  if (!executionContext) {
    throw new Error("k6 failed to capture execution context");
  }
  return {
    executionContext,
    matcherName,
    expected,
    received,
    customMessage,
    ...additionalInfo
  };
}
async function createMatcher2(matcherName, checkFn, expected, received, {
  locator,
  retryConfig,
  usedAssert,
  isSoft,
  isNegated = false,
  options = {},
  message
}) {
  const info = createMatcherInfo2(matcherName, expected, received, {
    matcherSpecific: {
      locator,
      timeout: options.timeout,
      isNegated
    }
  }, message);
  try {
    await withRetry(async () => {
      const result = await checkFn();
      const finalResult = isNegated ? !result : result;
      if (!finalResult) {
        throw new Error("matcher failed");
      }
      usedAssert(
        finalResult,
        MatcherErrorRendererRegistry.getRenderer(matcherName).render(
          info,
          MatcherErrorRendererRegistry.getConfig()
        ),
        isSoft
      );
    }, { ...retryConfig, ...options });
  } catch (_) {
    usedAssert(
      false,
      MatcherErrorRendererRegistry.getRenderer(matcherName).render(
        info,
        MatcherErrorRendererRegistry.getConfig()
      ),
      isSoft
    );
  }
}
var BooleanStateErrorRenderer = class extends ReceivedOnlyMatcherRenderer {
  getMatcherName() {
    return `toBe${this.state[0].toUpperCase()}${this.state.slice(1)}`;
  }
  getReceivedPlaceholder() {
    return "locator";
  }
  getSpecificLines(info, maybeColorize) {
    return [
      { label: "Expected", value: this.state, group: 3 },
      { label: "Received", value: this.oppositeState, group: 3 },
      { label: "Call log", value: "", group: 3 },
      {
        label: "",
        value: maybeColorize(
          `  - expect.toBe${this.state[0].toUpperCase()}${this.state.slice(1)} with timeout ${info.matcherSpecific?.timeout}ms`,
          "darkGrey"
        ),
        group: 3,
        raw: true
      },
      {
        label: "",
        value: maybeColorize(`  - waiting for locator`, "darkGrey"),
        group: 3,
        raw: true
      }
    ];
  }
};
var ToBeCheckedErrorRenderer = class extends BooleanStateErrorRenderer {
  state = "checked";
  oppositeState = "unchecked";
};
var ToBeDisabledErrorRenderer = class extends BooleanStateErrorRenderer {
  state = "disabled";
  oppositeState = "enabled";
};
var ToBeEditableErrorRenderer = class extends BooleanStateErrorRenderer {
  state = "editable";
  oppositeState = "uneditable";
};
var ToBeEnabledErrorRenderer = class extends BooleanStateErrorRenderer {
  state = "enabled";
  oppositeState = "disabled";
};
var ToBeHiddenErrorRenderer = class extends BooleanStateErrorRenderer {
  state = "hidden";
  oppositeState = "visible";
};
var ToBeVisibleErrorRenderer = class extends BooleanStateErrorRenderer {
  state = "visible";
  oppositeState = "hidden";
};
var ToHaveValueErrorRenderer = class extends ExpectedReceivedMatcherRenderer {
  getMatcherName() {
    return "toHaveValue";
  }
  getSpecificLines(info, maybeColorize) {
    return [
      // FIXME (@oleiade): When k6/#4210 is fixed, we can use the locator here.
      // { label: "Locator", value: maybeColorize(`locator('${info.matcherSpecific?.locator}')`, "white"), group: 3 },
      {
        label: "Expected",
        value: maybeColorize(info.expected, "green"),
        group: 3
      },
      {
        label: "Received",
        value: maybeColorize(info.received, "red"),
        group: 3
      },
      { label: "Call log", value: "", group: 3 },
      {
        label: "",
        value: maybeColorize(
          `  - expect.toHaveValue with timeout ${info.matcherSpecific?.timeout}ms`,
          "darkGrey"
        ),
        group: 3,
        raw: true
      },
      // FIXME (@oleiade): When k6/#4210 is fixed, we can use the locator's selector here.
      {
        label: "",
        value: maybeColorize(`  - waiting for locator`, "darkGrey"),
        group: 3,
        raw: true
      }
    ];
  }
};
async function withRetry(assertion, options = {}) {
  const timeout = options.timeout ?? DEFAULT_RETRY_OPTIONS.timeout;
  const interval = options.interval ?? DEFAULT_RETRY_OPTIONS.interval;
  const getNow = options._now ?? (() => Date.now());
  const sleep = options._sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const startTime = getNow();
  while (getNow() - startTime < timeout) {
    try {
      await assertion();
      return true;
    } catch (_error) {
    }
    await sleep(interval);
  }
  throw new RetryTimeoutError(
    `Expect condition not met within ${timeout}ms timeout`
  );
}
var RetryTimeoutError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "RetryTimeoutError";
  }
};

// expect.ts
var expect = makeExpect();
function makeExpect(baseConfig) {
  const config = ConfigLoader.load(baseConfig);
  return Object.assign(
    function(value, message) {
      if (isLocator(value)) {
        return createExpectation2(
          value,
          config,
          message
        );
      } else {
        return createExpectation(
          value,
          config,
          message
        );
      }
    },
    {
      soft(value, message) {
        if (isLocator(value)) {
          return createExpectation2(
            value,
            { ...config, soft: true },
            message
          );
        } else {
          return createExpectation(
            value,
            { ...config, soft: true },
            message
          );
        }
      },
      configure(newConfig) {
        return makeExpect(newConfig);
      },
      get config() {
        return { ...config };
      }
    }
  );
}
function isLocator(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const locatorProperties = [
    "clear",
    "isEnabled",
    "isHidden",
    "getAttribute",
    "selectOption",
    "press",
    "type",
    "dispatchEvent",
    "dblclick",
    "setChecked",
    "isDisabled",
    "focus",
    "innerText",
    "inputValue",
    "check",
    "isEditable",
    "fill",
    "textContent",
    "hover",
    "waitFor",
    "click",
    "uncheck",
    "isChecked",
    "isVisible",
    "innerHTML",
    "tap"
  ];
  const hasLocatorProperties = (value2) => {
    return locatorProperties.every((prop) => prop in value2);
  };
  return value !== null && value !== void 0 && typeof value === "object" && hasLocatorProperties(value);
}
export {
  colorize,
  expect
};
//# sourceMappingURL=index.js.map
