import { MODULE_NAME } from "./consts.js";

/// This function is used to fix the evolution cost of items in the summoner class items compendium
/// It will set the cost of the item based on the folder it is in, and also remove the evolution pool effect
/// from the item if it is present
export function fixEvolutionCost()
{
    const items = game.packs.get(`${MODULE_NAME}.summoner-class-items`);
    items.folders.forEach(async (f) => {
        if (f.name.endsWith("Point"))
        {
            const cost = parseInt(f.name.split(" ")[0]);
            console.log(`Processing folder ${f.name} with cost ${cost}`);
            for (let c of f.contents) {
                const doc = await items.getDocument(c._id);
                if (doc.getFlag(MODULE_NAME, "cost") === cost) continue;
                await doc.setFlag(MODULE_NAME, "cost", cost);
                console.log(`    ${doc.name}`);

                if (doc.effects)
                {
                    for (const effect of doc.effects)
                    {
                        const change = effect.changes.find(c => c.key === "system.scale.item.evolution-pool");
                        if (change)
                        {
                            console.log(`    Removing effect ${effect._id}`);
                            const changes = effect.changes.filter(c => c.key !== "system.scale.item.evolution-pool");
                            await effect.update({ changes });
                        }
                    }
                }
            }
        }
    });
    return "Done";
}

