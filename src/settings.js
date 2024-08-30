import { MODULE_NAME } from "./consts.js";

export function registerSettings() 
{
    game.settings.register(MODULE_NAME, "showInstructions", {
        name: "Show instructions on startup",
        hint: "",
        scope: "client",
        config: true,
        type: Boolean,
        default: true
    });
};