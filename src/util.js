import { MODULE_NAME } from "./consts.js";
const itemsInDescriptionRegex = "@UUID\\[(\\S+)\\]\\{([^\\}]+)\\}";

export function hasGrantedItems(description)
{
    const matches = description.matchAll(new RegExp(itemsInDescriptionRegex, "g"));
    return Boolean(matches);
}

export async function getGrantedItems(description)
{
    const matches = description.matchAll(new RegExp(itemsInDescriptionRegex, "g"));
    let items = [];
    for (const match of matches)
    {
        const fullId = match[1];
        const [ _, module, compendium, rest ] = fullId.split(".");
        const id = fullId.split(".").pop();
        const pack = game.packs.get(`${module}.${compendium}`);
        const item = await pack?.getDocument(id);
        if (item) 
        {
            items.push(item);
        } else {
            console.log(`Could not find item with id ${id}`);
        }
    }
    return items;
}

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