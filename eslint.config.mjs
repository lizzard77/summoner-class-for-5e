import globals from "globals";
import pluginJs from "@eslint/js";

export default [
    {
        languageOptions: {
            globals: { ...globals.browser, "Hooks": "readonly", "game": "readonly", "Dialog" : "readonly", "ui" : "readonly" }
        }
    },
    pluginJs.configs.recommended,
];