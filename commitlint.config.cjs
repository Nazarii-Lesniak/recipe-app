module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-empty": [2, "never"],
    "scope-enum": [
      2,
      "always",
      [
        "auth",
        "recipes",
        "ai",
        "ui",
        "db",
        "i18n",
        "moderation",
        "ci",
        "repo",
        "domain"
      ]
    ]
  }
};
