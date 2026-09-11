/* =============================================================
   examples.js
   Realistic buggy code samples used by the "Try Example" buttons.
   Each entry provides a language, code, and error/problem
   description so the AI debugger has something meaningful to
   analyze immediately.
============================================================= */

(function (global) {
  "use strict";

  var EXAMPLES = {
    python: {
      language: "Python",
      code:
        "def average(numbers):\n" +
        "    total = 0\n" +
        "    for i in range(1, len(numbers)):\n" +
        "        total += numbers[i]\n" +
        "    return total / len(numbers)\n" +
        "\n" +
        "scores = [10, 20, 30, 40]\n" +
        "print(average(scores))\n",
      error:
        "The function is supposed to return the average of all the numbers, but the result " +
        "looks wrong — it seems to be skipping part of the list."
    },
    javascript: {
      language: "JavaScript",
      code:
        "function getUserName(user) {\n" +
        "  return user.profile.name.toUpperCase();\n" +
        "}\n" +
        "\n" +
        "const users = [\n" +
        "  { profile: { name: \"ada\" } },\n" +
        "  { profile: null }\n" +
        "];\n" +
        "\n" +
        "users.forEach(function (u) {\n" +
        "  console.log(getUserName(u));\n" +
        "});\n",
      error: "Uncaught TypeError: Cannot read properties of null (reading 'name')"
    },
    cpp: {
      language: "C++",
      code:
        "#include <iostream>\n" +
        "using namespace std;\n" +
        "\n" +
        "int main() {\n" +
        "    int scores[5] = {10, 20, 30, 40, 50};\n" +
        "    int total = 0;\n" +
        "    for (int i = 0; i <= 5; i++) {\n" +
        "        total += scores[i];\n" +
        "    }\n" +
        "    cout << \"Total: \" << total << endl;\n" +
        "    return 0;\n" +
        "}\n",
      error: "Program compiles but sometimes prints a garbage total or crashes at runtime."
    }
  };

  /**
   * Retrieve an example by key ("python" | "javascript" | "cpp").
   * @param {string} key
   * @returns {{language:string, code:string, error:string}|null}
   */
  function getExample(key) {
    return EXAMPLES[key] || null;
  }

  /**
   * List all available example keys, useful for building UI dynamically.
   * @returns {string[]}
   */
  function listExampleKeys() {
    return Object.keys(EXAMPLES);
  }

  global.Examples = {
    getExample: getExample,
    listExampleKeys: listExampleKeys
  };
})(window);
