ServerEvents.recipes(event => {
    // --- TECH (Create + Immersive) ---
    event.remove({ output: 'create:water_wheel' })
    event.shaped('create:water_wheel', [' T ', 'TAT', ' T '], { T: 'immersiveengineering:treated_wood_horizontal', A: 'create:andesite_alloy' })
    
    event.recipes.create.mixing('immersiveengineering:dust_steel', ['minecraft:iron_dust', 'immersiveengineering:dust_coal', 'immersiveengineering:dust_coal']).heated()
    
    event.remove({ output: 'immersiveengineering:heavy_engineering' })
    event.shaped('immersiveengineering:heavy_engineering', ['SPS', 'EME', 'SPS'], {
        S: 'immersiveengineering:sheetmetal_steel', P: 'create:piston_extension_pole', E: 'immersiveengineering:component_steel', M: 'create:precision_mechanism'
    })

    // --- ENERGY & AE2 ---
    event.remove({ output: 'ae2:controller' })
    event.shaped('ae2:controller', ['SFS', 'FHF', 'SFS'], { S: 'ae2:sky_stone_block', F: 'ae2:fluix_crystal', H: 'immersiveengineering:heavy_engineering' })
    
    event.remove({ output: 'bigreactors:reactor_casing' })
    event.shaped('4x bigreactors:reactor_casing', ['SCS', 'LGL', 'SCS'], { S: 'immersiveengineering:plate_steel', L: 'immersiveengineering:plate_lead', C: 'immersiveengineering:concrete', G: 'bigreactors:graphite_ingot' })

    // --- MAGIC (Occultism + Ars Nouveau + Reliquary) ---
    event.remove({ output: 'occultism:chalk_white_impure' })
    event.shapeless('occultism:chalk_white_impure', ['minecraft:calcite', 'minecraft:prismarine_shard', 'ars_nouveau:source_gem'])
    
    event.remove({ output: 'reliquary:handgun' })
    event.shaped('reliquary:handgun', [' GI', 'PSG', 'LM '], {
        G: 'minecraft:gold_ingot', I: 'immersiveengineering:ingot_steel', P: 'create:precision_mechanism', S: 'reliquary:magazine', L: 'immersiveengineering:treated_wood_horizontal', M: 'immersiveengineering:component_steel'
    })

    // Ritual: Golden Bowl
    event.remove({ output: 'occultism:golden_sacrificial_bowl' })
    event.recipes.ars_nouveau.enchanting_apparatus(
        ['minecraft:gold_ingot', 'forbidden_arcanus:dark_stone', 'minecraft:nautilus_shell', 'minecraft:gold_ingot'],
        'ars_nouveau:arcane_pedestal', 'occultism:golden_sacrificial_bowl', 1000
    )

    // Bans
    ['waystones:waystone', 'waystones:warp_stone', 'reliquary:rending_gale', 'reliquary:alkahestry_tome', 'reliquary:twilight_cloak'].forEach(i => event.remove({ output: i }))
})

// LOOT
LootJS.modifiers((event) => {
    event.addLootType("entity").matchEntity(["alexscaves:deep_one", "aquamirae:captain_cornelia"]).randomChance(0.20).addLoot("reliquary:zombie_heart");
    event.addLootType("entity").matchEntity(["creeperoverhaul:ocean_creeper"]).randomChance(0.15).addLoot("reliquary:catalyzing_gland");
    event.removeLoot("reliquary:rending_gale");
    event.removeLoot("reliquary:handgun");
});

// MECHANICS (Nether Mage Buff)
PlayerEvents.tick(event => {
    if (event.server.tickCount % 20 != 0) return
    let player = event.player
    let hasArchmage = player.headArmorItem.id.includes('archmage')
    if (hasArchmage && player.hasEffect('minecraft:fire_resistance')) {
        player.potionEffects.add('minecraft:strength', 40, 1, false, false)
        if (player.isInLava()) player.potionEffects.add('minecraft:regeneration', 40, 1, false, false)
    }
})
