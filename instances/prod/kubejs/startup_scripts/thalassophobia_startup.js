ItemEvents.modification(event => {
    // 1. Armor: Steampunk -> Tank
    const steam = ['immersive_armors:steampunk_helmet', 'immersive_armors:steampunk_chestplate', 'immersive_armors:steampunk_leggings', 'immersive_armors:steampunk_boots'];
    steam.forEach(i => event.modify(i, m => { m.armorProtection+=3; m.armorToughness=4.0; m.knockbackResistance=0.5; m.maxDamage*=2 }));
    
    // 2. Armor: Nerf Scuba
    const scuba = ['simplyscuba:scuba_mask', 'simplyscuba:scuba_bcds', 'simplyscuba:scuba_leggings', 'simplyscuba:scuba_boots'];
    scuba.forEach(i => event.modify(i, m => { m.armorProtection=1; m.armorToughness=0; m.maxDamage=150 }));

    // 3. Weapons: Balance
    event.modify('aquamirae:terrible_sword', m => { m.attackDamage=8.0; m.attackSpeed=1.8 });
    event.modify('magistuarmory:steel_zweihander', m => { m.attackDamage=14.0; m.attackSpeed=0.8 });
    event.modify('cataclysm:void_forge', m => { m.attackDamage=18.0; m.attackSpeed=0.9 });
    event.modify('minecraft:diamond_sword', m => m.attackDamage=6.0);
})
