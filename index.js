const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionsBitField,
  REST,
  Routes,
  Events,
  ActivityType,
  ButtonBuilder,    
  ActionRowBuilder,
  ButtonStyle,      
  ChannelType,
  ModalBuilder,      
  TextInputBuilder,  
  TextInputStyle,
  Partials,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType
} = require('discord.js');

// --- CONFIGURATION ---
const GUILD_ID = '1460970020023828515'; 
const TICKET_SUPPORT_ROLE = '1460973031051759738'; 
const defaultPrefix = '!';
// ---------------------

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// --- DATA STORAGE ---
const guildSettings = new Map();
const snipes = new Map();
const skullboardCache = new Set();
const afkUsers = new Map();
const uwuTargets = new Set();
const stickyMessages = new Map();

// --- ANIME GIF CONFIGURATION (Clean - No Emojis) ---
const animeActions = {
    kiss: { text: "**{user}** kissed **{target}**!", solo: "**{user}** is blowing a kiss.", gifs: ["https://media.tenor.com/F02Ep3l2EpUAAAAC/cute-anime-kiss.gif", "https://media.tenor.com/dn_KuO20bsCeDyyG/kiss-anime.gif"] },
    slap: { text: "**{user}** slapped **{target}**!", solo: "**{user}** is slapping the air!", gifs: ["https://media.tenor.com/XiYuU9h44-AAAAAC/anime-slap-mad.gif", "https://media.tenor.com/Ws6Dm1ZW_vMAAAAC/girl-slap.gif"] },
    punt: { text: "**{user}** punted **{target}**!", solo: "**{user}** is practicing kicks.", gifs: ["https://media.tenor.com/6a42QlkVSVYAAAAC/anime-kick.gif"] },
    hug: { text: "**{user}** hugged **{target}**!", solo: "**{user}** needs a hug.", gifs: ["https://media.tenor.com/kCZjTqCKiggAAAAC/hug.gif"] },
    smirk: { text: "**{user}** smirks at **{target}**", solo: "**{user}** smirks.", gifs: ["https://media.tenor.com/6J7d_F4v7mQAAAAC/anime-smirk.gif"] },
    seduce: { text: "**{user}** is seducing **{target}**", solo: "**{user}** looks flirtatious.", gifs: ["https://media.tenor.com/Wl1C9q0Y3cEAAAAC/anime-flirt.gif"] },
    rage: { text: "**{user}** rages at **{target}**", solo: "**{user}** is FURIOUS!", gifs: ["https://media.tenor.com/p_4b6W8X1cEAAAAC/anime-rage.gif"] },
    bleh: { text: "**{user}** goes BLEH at **{target}**", solo: "**{user}** goes BLEH.", gifs: ["https://media.tenor.com/8J3d9_1Y3cEAAAAC/anime-bleh.gif"] },
    pat: { text: "**{user}** pats **{target}**.", solo: "**{user}** pats their own head.", gifs: ["https://media.tenor.com/E6fMkQRZBdIAAAAC/anime-pat.gif"] },
    bonk: { text: "**{user}** BONKED **{target}**!", solo: "**{user}** bonks themselves.", gifs: ["https://media.tenor.com/6J7d_F4v7mQAAAAC/bonk-anime.gif"] }
};

// --- HELPER FUNCTIONS ---
function parseDuration(str) {
  if (!str) return null;
  const regex = /(\d+)(d|h|m|s)/g;
  let ms = 0, match, found = false;
  while ((match = regex.exec(str)) !== null) {
    found = true;
    const val = parseInt(match[1]);
    switch (match[2]) {
      case 'd': ms += val * 86400000; break;
      case 'h': ms += val * 3600000; break;
      case 'm': ms += val * 60000; break;
      case 's': ms += val * 1000; break;
    }
  }
  if (!found && !isNaN(str)) return parseInt(str) * 1000; 
  return found ? ms : null;
}

function uwuify(text) {
  text = text.replace(/(?:r|l)/g, 'w').replace(/(?:R|L)/g, 'W').replace(/n([aeiou])/g, 'ny$1').replace(/N([aeiou])/g, 'Ny$1').replace(/N([AEIOU])/g, 'Ny$1').replace(/ove/g, 'uv');
  return text + ' UwU';
}

// --- SLASH COMMAND DEFINITIONS ---
const commands = [
  { name: 'ping', description: 'Check latency' }, 
  { name: 'talk', description: 'Make the bot say something', options: [{ name: 'message', description: 'What to say', type: 3, required: true }, { name: 'channel', description: 'Where to send it', type: 7, required: false }], default_member_permissions: '8' },
  { name: 'me', description: 'Credits' },
  
  // GIVEAWAY
  { name: 'giveaway', description: 'Start a giveaway via form', default_member_permissions: '8' },
  { name: 'giveaway-end', description: 'End a giveaway immediately', options: [{ name: 'message_id', description: 'Message ID of the giveaway', type: 3, required: true }], default_member_permissions: '8' },
  { name: 'giveaway-reroll', description: 'Pick a new winner', options: [{ name: 'message_id', description: 'Message ID of the giveaway', type: 3, required: true }], default_member_permissions: '8' },
  
  // ADMIN
  { name: 'mute', description: 'Mute a user', options: [{ name: 'user', description: 'User to mute', type: 6, required: true }, { name: 'duration', description: 'How long? (e.g. 10m)', type: 3, required: false }], default_member_permissions: '8' },
  { name: 'unmute', description: 'Unmute a user', options: [{ name: 'user', description: 'User to unmute', type: 6, required: true }], default_member_permissions: '8' },
  { name: 'ban', description: 'Ban a user', options: [{ name: 'user', description: 'User to ban', type: 6, required: true }, { name: 'reason', description: 'Why?', type: 3, required: false }], default_member_permissions: '8' },
  { name: 'kick', description: 'Kick a user', options: [{ name: 'user', description: 'User to kick', type: 6, required: true }, { name: 'reason', description: 'Why?', type: 3, required: false }], default_member_permissions: '8' },
  { name: 'purge', description: 'Delete messages', options: [{ name: 'amount', description: 'Number of messages', type: 4, required: true }], default_member_permissions: '8' },
  { name: 'lock', description: 'Lock current channel', default_member_permissions: '8' },
  { name: 'unlock', description: 'Unlock current channel', default_member_permissions: '8' },
  { name: 'deafen', description: 'Deafen user in voice', options: [{ name: 'user', description: 'Target user', type: 6, required: true }], default_member_permissions: '8' },
  { name: 'undeafen', description: 'Undeafen user in voice', options: [{ name: 'user', description: 'Target user', type: 6, required: true }], default_member_permissions: '8' },
  { name: 'setprefix', description: 'Change bot prefix', options: [{ name: 'new_prefix', description: 'New symbol', type: 3, required: true }], default_member_permissions: '8' },
  { name: 'uwulock', description: 'Force user to speak UwU', options: [{ name: 'user', description: 'Target user', type: 6, required: true }], default_member_permissions: '8' },
  { name: 'uwuunlock', description: 'Free user from UwU', options: [{ name: 'user', description: 'Target user', type: 6, required: true }], default_member_permissions: '8' },
  { name: 'stick', description: 'Create a sticky reminder', options: [{ name: 'message', description: 'The message', type: 3, required: true }], default_member_permissions: '8' },
  { name: 'unstick', description: 'Remove sticky message', default_member_permissions: '8' },
  
  // UTILITY
  { name: 'afk', description: 'Set AFK status', options: [{ name: 'reason', description: 'Why are you AFK?', type: 3, required: false }] },
  { name: 'snipe', description: 'Show last deleted message' },
  { name: 'help', description: 'Show command list' },
  { name: 'userinfo', description: 'Get user details', options: [{ name: 'user', description: 'Target user', type: 6, required: false }] },
  { name: 'avatar', description: 'Get user avatar', options: [{ name: 'user', description: 'Target user', type: 6, required: false }] },
  // EMBED
  { 
    name: 'embed', 
    description: 'Create a custom embed', 
    options: [
      { name: 'title', description: 'Title', type: 3, required: false },
      { name: 'description', description: 'Description', type: 3, required: false },
      { name: 'color', description: 'Color (Hex)', type: 3, required: false },
      { name: 'image', description: 'Image URL', type: 3, required: false },
      { name: 'thumbnail', description: 'Thumbnail URL', type: 3, required: false },
      { name: 'footer', description: 'Footer text', type: 3, required: false },
      { name: 'content', description: 'Text sent with the embed (mentions etc)', type: 3, required: false },
      { name: 'channel', description: 'Channel to send to', type: 7, required: false }
    ],
    default_member_permissions: '8'
  },
  
  // SETUP COMMANDS
  { name: 'ticketsetup', description: 'Setup ticket panel (Dropdown)', options: [{ name: 'channel', description: 'Panel location', type: 7, required: true }, { name: 'category', description: 'Ticket category', type: 7, channel_types: [4], required: false }, { name: 'role', description: 'Role to ping', type: 8, required: false }, { name: 'title', description: 'Embed Title', type: 3, required: false }, { name: 'description', description: 'Embed Desc', type: 3, required: false }], default_member_permissions: '8' },
  { name: 'autoreact-setup', description: 'Setup auto-reactions', options: [{ name: 'emoji', description: 'The emoji', type: 3, required: true }, { name: 'role', description: 'Filter by role', type: 8, required: false }], default_member_permissions: '8' },
  { name: 'autorole-setup', description: 'Setup auto-role on join', options: [{ name: 'role', description: 'Role to give', type: 8, required: true }], default_member_permissions: '8' },
  { 
    name: 'welcome-setup', 
    description: 'Setup welcome messages', 
    options: [
        { name: 'channel', description: 'Welcome channel', type: 7, required: true }, 
        { name: 'message', description: 'Custom message (Embed Desc)', type: 3, required: false }, 
        { name: 'content', description: 'Text outside the embed (mentions etc)', type: 3, required: false },
        { name: 'type', description: 'Text or Embed', type: 3, choices: [{name:'Text',value:'text'},{name:'Embed',value:'embed'}], required: false }, 
        { name: 'image_url', description: 'Embed Image', type: 3, required: false }, 
        { name: 'color', description: 'Embed Color', type: 3, required: false }
    ], 
    default_member_permissions: '8' 
  },
  { name: 'leave-setup', description: 'Setup leave messages', options: [{ name: 'channel', description: 'Leave channel', type: 7, required: true }, { name: 'message', description: 'Custom message', type: 3, required: false }], default_member_permissions: '8' },
  { name: 'skullboard-setup', description: 'Setup skullboard logging', options: [{ name: 'channel', description: 'Log channel', type: 7, required: true }], default_member_permissions: '8' },
  { name: 'boost-setup', description: 'Setup boost announcement', options: [{ name: 'channel', description: 'Announce channel', type: 7, required: true }, { name: 'message', description: 'Custom message', type: 3, required: false }], default_member_permissions: '8' },
  
  // REACTION ROLE
  { 
    name: 'reactionrole', 
    description: 'Add a reaction role button to a message', 
    options: [
        { name: 'role', description: 'Role to give', type: 8, required: true }, 
        { name: 'label', description: 'Button Text', type: 3, required: false }, 
        { name: 'emoji', description: 'Button Emoji', type: 3, required: false },
        { name: 'message_id', description: 'ID of existing bot message (Leave empty for new)', type: 3, required: false },
        { name: 'title', description: 'Embed Title (Custom)', type: 3, required: false },
        { name: 'description', description: 'Embed Description (Custom)', type: 3, required: false }
    ], 
    default_member_permissions: '8' 
  }
];

// --- STARTUP (LOCAL/GUILD MODE) ---
client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setActivity('Watching Fish Out of Water', { type: ActivityType.Playing });
  const rest = new REST().setToken(client.token);
  
  try {
      console.log(`Refreshing Guild Commands for: ${GUILD_ID}...`);
      await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), { body: commands });
      console.log('✅ Commands Registered Locally!');
  } catch (error) { 
      console.error('Slash error:', error); 
  }
});

// --- SNIPE HANDLER ---
client.on('messageDelete', message => {
    if (message.author?.bot || !message.content && !message.attachments.size) return;
    snipes.set(message.channel.id, {
        content: message.content,
        author: message.author,
        image: message.attachments.first()?.url,
        time: Date.now()
    });
});

// --- SKULLBOARD HANDLER ---
client.on('messageReactionAdd', async (reaction, user) => {
    if (reaction.partial) try { await reaction.fetch(); } catch (e) { return; }
    if (reaction.message.partial) try { await reaction.message.fetch(); } catch (e) { return; }
    if (reaction.emoji.name !== '💀' || reaction.count < 3) return;
    
    const config = guildSettings.get(reaction.message.guild.id);
    if (!config?.skullboardId || skullboardCache.has(reaction.message.id)) return;
    
    const channel = reaction.message.guild.channels.cache.get(config.skullboardId);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setAuthor({ name: reaction.message.author.tag, iconURL: reaction.message.author.displayAvatarURL() })
        .setDescription(reaction.message.content || '*(Image)*')
        .addFields({ name: 'Source', value: `[Jump](${reaction.message.url})` })
        .setColor(0xFFFFFF).setTimestamp();
    if (reaction.message.attachments.size > 0) embed.setImage(reaction.message.attachments.first().url);
    
    // Clean Output
    await channel.send({ content: `**${reaction.count}** <#${reaction.message.channel.id}>`, embeds: [embed] });
    skullboardCache.add(reaction.message.id);
});

// --- MAIN MESSAGE HANDLER (Prefix Commands) ---
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // 1. UWU LOCK
  if (uwuTargets.has(message.author.id)) {
    try {
      await message.delete();
      await message.channel.send(`**${message.member.displayName}**: ${uwuify(message.content)}`);
      return;
    } catch (e) {}
  }

  // 2. STICKY MESSAGE
  if (stickyMessages.has(message.channel.id)) {
    const data = stickyMessages.get(message.channel.id);
    if (data.lastMsgId) message.channel.messages.delete(data.lastMsgId).catch(()=>{});
    const sent = await message.channel.send(`**Reminder:**\n${data.content}`);
    data.lastMsgId = sent.id;
    stickyMessages.set(message.channel.id, data);
  }

  // 3. AFK CHECK
  if (message.mentions.users.size > 0) {
    message.mentions.users.forEach(u => {
      if (afkUsers.has(u.id)) message.reply(`**${u.username}** is AFK: ${afkUsers.get(u.id).reason}`);
    });
  }
  if (afkUsers.has(message.author.id)) {
    afkUsers.delete(message.author.id);
    message.reply(`Welcome back **${message.author.username}**! AFK removed.`);
  }

  // 4. AUTO REACT
  const config = guildSettings.get(message.guild.id);
  if (config?.autoReactRoles) {
      message.member.roles.cache.forEach(role => {
          if (config.autoReactRoles.has(role.id)) message.react(config.autoReactRoles.get(role.id)).catch(()=>{});
      });
  }

  // 5. COMMAND PARSING
  const serverPrefix = config?.prefix || defaultPrefix;
  if (!message.content.startsWith(serverPrefix)) return;
  
  const args = message.content.slice(serverPrefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  try {
    // ANIME
    if (animeActions[command]) {
        const action = animeActions[command];
        const target = message.mentions.users.first();
        const gif = action.gifs[Math.floor(Math.random() * action.gifs.length)];
        const desc = target && target.id !== message.author.id 
            ? action.text.replace(/{user}/g, message.author.toString()).replace(/{target}/g, target.toString())
            : action.solo.replace(/{user}/g, message.author.toString());
        return message.channel.send({ embeds: [new EmbedBuilder().setDescription(desc).setImage(gif).setColor(0xFFC0CB)] });
    }

    // UTILITY
    if (command === 'ping') return message.reply(`Pong! ${Math.round(client.ws.ping)}ms`);
    if (command === 'me') return message.reply('Made by Enkkd.');
    if (command === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('Nocte Bot Command List')
            .setColor(0x00AAFF)
            .setDescription(`**Prefix:** \`${serverPrefix}\`\nUse \`/\` for Slash Commands or \`${serverPrefix}\` for text commands.`)
            .addFields(
                { name: 'Giveaways (Slash)', value: '`/giveaway` - Start a giveaway\n`/giveaway-end` - End immediately\n`/giveaway-reroll` - Pick new winner' },
                { name: 'Anime & Fun', value: '`kiss`, `slap`, `punt`, `hug`, `smirk`, `seduce`, `rage`, `bleh`, `pat`, `bonk`\n`snipe`, `afk`, `avatar`, `userinfo`, `me`, `embed`, `talk`' },
                { name: 'Moderation', value: '`ban`, `kick`, `mute`, `unmute`, `lock`, `unlock`, `purge`, `deafen`, `undeafen`\n`stick`, `unstick` (Sticky Messages)' },
                { name: 'Setup (Slash Only)', value: '`/ticketsetup`, `/reactionrole`, `/skullboard-setup`\n`/welcome-setup`, `/leave-setup`, `/autorole-setup`' }
            )
            .setFooter({ text: 'Developed by Enkkd' });
        return message.reply({ embeds: [embed] });
    }
    
    // !talk
    if (command === 'talk') {
        if(!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply("Error: You need Admin permissions.");
        const text = args.join(' ');
        if (!text) return message.reply("Error: Provide a message.");
        message.delete().catch(()=>{});
        return message.channel.send(text);
    }

    // !embed
    if (command === 'embed') {
        if(!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply("Error: You need Admin permissions.");
        const text = args.join(' ');
        if (!text) return message.reply("Error: Provide embed text.");
        const embed = new EmbedBuilder().setDescription(text).setColor(0x0099FF);
        return message.channel.send({ embeds: [embed] });
    }

    if (command === 'avatar') {
        const member = message.mentions.members.first() || message.member;
        const embed = new EmbedBuilder().setTitle(`${member.user.username}'s Avatar`).setImage(member.user.displayAvatarURL({dynamic:true, size:4096})).setColor(0x00AAFF);
        return message.reply({embeds:[embed]});
    }
    if (command === 'userinfo') {
        const member = message.mentions.members.first() || message.member;
        const embed = new EmbedBuilder().setTitle(`User: ${member.user.tag}`).addFields({name:'Joined', value:`<t:${Math.floor(member.joinedTimestamp/1000)}:R>`}).setColor(0x00AAFF).setThumbnail(member.user.displayAvatarURL());
        return message.reply({embeds:[embed]});
    }
    if (command === 'afk') {
        const reason = args.join(' ') || 'No reason';
        afkUsers.set(message.author.id, { reason, time: Date.now() });
        return message.reply(`AFK set: ${reason}`);
    }
    if (command === 'snipe') {
        const msg = snipes.get(message.channel.id);
        if (!msg) return message.reply('Error: Nothing to snipe!');
        const embed = new EmbedBuilder().setAuthor({name:msg.author.tag, iconURL:msg.author.displayAvatarURL()}).setDescription(msg.content||'*(Image)*').setColor(0xFF0000).setFooter({text:'Deleted recently'});
        if(msg.image) embed.setImage(msg.image);
        return message.reply({embeds:[embed]});
    }

    // MODERATION
    if (command === 'mute') {
        if(!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return message.reply("Error: Permission Missing.");
        const target = message.mentions.members.first();
        if(!target) return message.reply('Error: Mention user.');
        
        let role = message.guild.roles.cache.find(r=>r.name==='Muted');
        if(!role) {
            try {
                role = await message.guild.roles.create({ name: 'Muted', color: '#000000', permissions: [] });
                message.channel.send('Created "Muted" role. Applying permissions to channels...');
            } catch(e) { console.log(e); }
        }
        
        message.guild.channels.cache.forEach(async (channel) => {
            if(channel.isTextBased()) {
                await channel.permissionOverwrites.edit(role, { SendMessages: false, AddReactions: false }).catch(()=>{});
            }
        });

        await target.roles.add(role);
        message.reply(`Muted **${target.user.tag}**`);
        const ms = parseDuration(args[1]);
        if(ms) setTimeout(()=> target.roles.remove(role).catch(()=>{}), ms);
    }
    if (command === 'unmute') {
        if(!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return message.reply("Error: Permission Missing.");
        const target = message.mentions.members.first();
        if(!target) return message.reply('Error: Mention user.');
        const role = message.guild.roles.cache.find(r=>r.name==='Muted');
        if(role) await target.roles.remove(role);
        message.reply(`Unmuted **${target.user.tag}**`);
    }
    if (command === 'deafen') {
        if(!message.member.permissions.has(PermissionsBitField.Flags.DeafenMembers)) return message.reply("Error: Permission Missing.");
        const target = message.mentions.members.first();
        if(!target || !target.voice.channel) return message.reply('Error: User not in voice.');
        await target.voice.setDeaf(true);
        message.reply(`Deafened.`);
    }
    if (command === 'undeafen') {
        if(!message.member.permissions.has(PermissionsBitField.Flags.DeafenMembers)) return message.reply("Error: Permission Missing.");
        const target = message.mentions.members.first();
        if(!target || !target.voice.channel) return message.reply('Error: User not in voice.');
        await target.voice.setDeaf(false);
        message.reply(`Undeafened.`);
    }

    if (command === 'lock') {
        if(!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return;
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
        return message.reply('Channel Locked.');
    }
    if (command === 'unlock') {
        if(!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return;
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
        return message.reply('Channel Unlocked.');
    }
    if (command === 'purge') {
        if(!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount > 100) return message.reply('Error: 1-100 only.');
        await message.channel.bulkDelete(amount, true);
        return message.channel.send(`Deleted ${amount}.`).then(m => setTimeout(() => m.delete().catch(()=>{}), 3000));
    }
    if (command === 'ban') {
        if(!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
        const target = message.mentions.members.first();
        if(target?.bannable) { await target.ban(); message.reply(`Banned ${target.user.tag}`); }
    }
    if (command === 'kick') {
        if(!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return;
        const target = message.mentions.members.first();
        if(target?.kickable) { await target.kick(); message.reply(`Kicked ${target.user.tag}`); }
    }
    
    // STICKY
    if (command === 'stick') {
        if(!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;
        const text = args.join(' ');
        const sent = await message.channel.send(`**Reminder:**\n${text}`);
        stickyMessages.set(message.channel.id, { content: text, lastMsgId: sent.id });
        return message.delete();
    }
    if (command === 'unstick') {
        if(!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;
        if(stickyMessages.has(message.channel.id)) {
            stickyMessages.delete(message.channel.id);
            message.reply('Sticky removed.');
        }
    }

    // SETTINGS
    if (command === 'setprefix') {
        if(!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
        if(!args[0]) return message.reply('Error: Provide prefix.');
        const cfg = guildSettings.get(message.guild.id) || {};
        cfg.prefix = args[0];
        guildSettings.set(message.guild.id, cfg);
        return message.reply(`Prefix is now: \`${args[0]}\``);
    }
    if (command === 'autoreact') {
        if(!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
        const role = message.mentions.roles.first();
        const emoji = args[1];
        if(!role || !emoji) return message.reply('Usage: !autoreact @Role <Emoji>');
        const cfg = guildSettings.get(message.guild.id) || {};
        if (!cfg.autoReactRoles) cfg.autoReactRoles = new Map();
        cfg.autoReactRoles.set(role.id, emoji);
        guildSettings.set(message.guild.id, cfg);
        message.reply(`Setup! Users with **${role.name}** will get ${emoji}.`);
    }

    // UWU
    if (command === 'uwulock') {
        if(!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
        const user = message.mentions.users.first();
        if(user) { uwuTargets.add(user.id); message.reply(`${user.tag} locked.`); }
    }
    if (command === 'uwuunlock') {
        if(!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
        const user = message.mentions.users.first();
        if(user) { uwuTargets.delete(user.id); message.reply(`${user.tag} freed.`); }
    }

  } catch (e) { console.error('Msg Error:', e); }
});

// --- SLASH COMMAND HANDLER ---
client.on('interactionCreate', async interaction => {
  // MODAL HANDLING
  if (interaction.isModalSubmit()) {
    // GIVEAWAY MODAL
    if (interaction.customId === 'giveaway_modal') {
        const title = interaction.fields.getTextInputValue('gw_title');
        const desc = interaction.fields.getTextInputValue('gw_desc');
        const ms = parseDuration(interaction.fields.getTextInputValue('gw_duration'));
        if (!ms || ms < 1000) return interaction.reply({content:'Error: Invalid time.', ephemeral:true});
        
        const endTime = Math.floor((Date.now() + ms) / 1000);
        const embed = new EmbedBuilder().setTitle(`GIVEAWAY: ${title}`).setDescription(`${desc}\n\nEnds: <t:${endTime}:R>\nReact to join.`).setColor(0xFFD700).setFooter({ text: `Host: ${interaction.user.tag}` });
        const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
        await msg.react('🎉');

        setTimeout(async () => {
            const m = await interaction.channel.messages.fetch(msg.id).catch(()=>null);
            if(!m) return;
            const users = await m.reactions.cache.get('🎉')?.users.fetch();
            const entries = users?.filter(u => !u.bot);
            if(!entries || entries.size === 0) { embed.setDescription('Ended. No entries.'); return m.edit({embeds:[embed]}); }
            const winner = entries.random();
            embed.setDescription(`**WINNER:** ${winner}\nPrize: ${title}`);
            embed.setColor(0x00FF00);
            m.edit({ content: `Congrats ${winner}!`, embeds: [embed] });
        }, ms);
        return;
    }
    
    // 🟢 TICKET MODAL SUBMISSION
    if (interaction.customId.startsWith('ticket_modal_')) {
        await interaction.deferReply({ ephemeral: true });
        const category = interaction.customId.replace('ticket_modal_', '');
        const subject = interaction.fields.getTextInputValue('ticket_subject');
        const desc = interaction.fields.getTextInputValue('ticket_desc');
        const chName = `ticket-${category}-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
        const cfg = guildSettings.get(interaction.guild.id) || {};
        try {
            const ch = await interaction.guild.channels.create({ name: chName, type: ChannelType.GuildText, parent: cfg.ticketCategory, permissionOverwrites: [{id:interaction.guild.id, deny:[PermissionsBitField.Flags.ViewChannel]}, {id:interaction.user.id, allow:[PermissionsBitField.Flags.ViewChannel]}] });
            const embed = new EmbedBuilder().setTitle(`Ticket: ${subject}`).setDescription(`**User:** ${interaction.user}\n**Category:** ${category.toUpperCase()}\n**Description:** ${desc}`).setColor(0x0099FF);
            const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger));
            let mentions = `${interaction.user} ` + (cfg.ticketRole ? `<@&${cfg.ticketRole}>` : (TICKET_SUPPORT_ROLE ? `<@&${TICKET_SUPPORT_ROLE}>` : ''));
            await ch.send({content: `New Ticket: ${mentions}`, embeds:[embed], components:[btn]});
            interaction.editReply(`Created ${ch}`);
        } catch(e) { interaction.editReply('Error creating channel.'); }
        return;
    }
  }

  // BUTTON & MENU HANDLING
  if (interaction.isButton() || interaction.isStringSelectMenu()) {
    // 🟢 TICKET DROPDOWN SELECTION
    if (interaction.customId === 'ticket_select') {
        const selected = interaction.values[0]; 
        const modal = new ModalBuilder().setCustomId(`ticket_modal_${selected}`).setTitle(`Open Ticket: ${selected.toUpperCase()}`);
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_subject').setLabel('Subject').setStyle(TextInputStyle.Short).setRequired(true)), 
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_desc').setLabel('Description').setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
        await interaction.showModal(modal);
        return;
    }

    if (interaction.customId === 'close_ticket') {
        interaction.reply('Closing...'); setTimeout(() => interaction.channel.delete(), 3000);
    } else if (interaction.customId.startsWith('rr_')) {
        const roleId = interaction.customId.split('_')[1];
        if(interaction.member.roles.cache.has(roleId)) { await interaction.member.roles.remove(roleId); interaction.reply({content:'Role Removed', ephemeral:true}); }
        else { await interaction.member.roles.add(roleId); interaction.reply({content:'Role Added', ephemeral:true}); }
    }
    return;
  }

  // SLASH COMMAND HANDLING
  if (!interaction.isChatInputCommand()) return;

  try {
    const { commandName, options } = interaction;

    // --- REACTION ROLE ---
    if (commandName === 'reactionrole') {
        await interaction.deferReply({ ephemeral: true });
        try {
            const role = options.getRole('role');
            const text = options.getString('label'); 
            const emoji = options.getString('emoji');
            const messageId = options.getString('message_id');
            const customTitle = options.getString('title');
            const customDesc = options.getString('description');

            const btn = new ButtonBuilder()
                .setCustomId(`rr_${role.id}`)
                .setStyle(ButtonStyle.Secondary); 

            if (text) btn.setLabel(text);
            if (emoji) btn.setEmoji(emoji);

            if (!text && !emoji) {
                return interaction.editReply('Error: You must provide either a Label or an Emoji.');
            }

            if (messageId) {
                const msg = await interaction.channel.messages.fetch(messageId);
                if (!msg) return interaction.editReply('Error: Message not found.');
                
                if (msg.author.id !== client.user.id) {
                    return interaction.editReply('Error: I can only edit messages sent by me (the bot).');
                }

                if (customTitle || customDesc) {
                    const existingEmbed = msg.embeds[0] ? EmbedBuilder.from(msg.embeds[0]) : new EmbedBuilder().setColor(0x0099FF);
                    if (customTitle) existingEmbed.setTitle(customTitle);
                    if (customDesc) existingEmbed.setDescription(customDesc);
                    await msg.edit({ embeds: [existingEmbed] });
                }

                let rows = msg.components.map(c => ActionRowBuilder.from(c));
                let added = false;
                
                for (const row of rows) {
                    const firstComponent = row.components[0];
                    if (firstComponent && firstComponent.data.type === 2 && row.components.length < 5) {
                        row.addComponents(btn);
                        added = true;
                        break;
                    }
                }

                if (!added) {
                    if (rows.length >= 5) return interaction.editReply('Error: Message has max rows (5).');
                    rows.push(new ActionRowBuilder().addComponents(btn));
                }
                
                await msg.edit({ components: rows });
                return interaction.editReply('Success: Added button to message.');
            } else {
                const embedTitle = customTitle || 'Get Roles';
                const embedDesc = customDesc || `Click below to get the ${role.name} role.`;
                
                const embed = new EmbedBuilder().setTitle(embedTitle).setDescription(embedDesc).setColor(role.color || 0x0099FF);
                const row = new ActionRowBuilder().addComponents(btn);
                await interaction.channel.send({ embeds: [embed], components: [row] });
                return interaction.editReply('Success: Created new reaction role message.');
            }
        } catch (e) {
            console.error(e);
            return interaction.editReply(`Error: ${e.message}`);
        }
    }

    // --- GIVEAWAY SHORTCUTS ---
    else if (commandName === 'giveaway') {
        const modal = new ModalBuilder().setCustomId('giveaway_modal').setTitle('Start Giveaway');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('gw_title').setLabel('Prize').setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('gw_desc').setLabel('Desc').setStyle(TextInputStyle.Paragraph).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('gw_duration').setLabel('Duration (1d 2h)').setStyle(TextInputStyle.Short).setRequired(true)));
        await interaction.showModal(modal);
        return;
    }
    else if (commandName === 'giveaway-end' || commandName === 'giveaway-reroll') {
        await interaction.deferReply();
        const msg = await interaction.channel.messages.fetch(options.getString('message_id')).catch(()=>null);
        if(!msg) return interaction.editReply('Error: Msg not found.');
        const reaction = msg.reactions.cache.get('🎉');
        const users = await reaction?.users.fetch();
        const entries = users?.filter(u => !u.bot);
        if(!entries || entries.size === 0) return interaction.editReply('Error: No entries.');
        const winner = entries.random();
        msg.reply(commandName.includes('end') ? `FORCED END: Congrats ${winner}!` : `REROLL: Congrats ${winner}!`);
        interaction.editReply('Done.');
        return;
    }

    // --- ALL OTHER COMMANDS (Prevent Crash) ---
    else {
        // 🟢 GLOBAL DEFER FOR ALL OTHER COMMANDS
        await interaction.deferReply({ ephemeral: false });

        if (commandName === 'ping') interaction.editReply(`Pong! ${Math.round(client.ws.ping)}ms`);
        else if (commandName === 'me') interaction.editReply('Made by Enkkd.');
        else if (commandName === 'help') {
            const embed = new EmbedBuilder().setTitle('Nocte Bot').setColor(0x00AAFF).setDescription('Prefix: `!` or `/`').setFooter({text:'Enkkd'});
            interaction.editReply({ embeds: [embed] });
        }
        else if (commandName === 'afk') {
            const reason = options.getString('reason') || 'No reason';
            afkUsers.set(interaction.user.id, { reason, time: Date.now() });
            interaction.editReply(`AFK set: ${reason}`);
        }
        else if (commandName === 'snipe') {
            const msg = snipes.get(interaction.channel.id);
            if (!msg) return interaction.editReply('Nothing to snipe!');
            const embed = new EmbedBuilder().setAuthor({name:msg.author.tag, iconURL:msg.author.displayAvatarURL()}).setDescription(msg.content||'*(Image)*').setColor(0xFF0000);
            if(msg.image) embed.setImage(msg.image);
            interaction.editReply({ embeds: [embed] });
        }
        // --- TICKET SETUP ---
        else if(commandName==='ticketsetup') {
            const cfg = guildSettings.get(interaction.guildId) || {};
            if(options.getChannel('category')) cfg.ticketCategory = options.getChannel('category').id;
            if(options.getRole('role')) cfg.ticketRole = options.getRole('role').id;
            guildSettings.set(interaction.guildId, cfg);
            
            const embed = new EmbedBuilder().setTitle(options.getString('title')||'Ticket Support').setDescription(options.getString('description')||'Select option below.').setColor(0x5865F2);
            const select = new StringSelectMenuBuilder().setCustomId('ticket_select').setPlaceholder('Select Option').addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Concern').setValue('concern'),
                new StringSelectMenuOptionBuilder().setLabel('Boost').setValue('boost'),
                new StringSelectMenuOptionBuilder().setLabel('Other').setValue('other'),
            );
            await options.getChannel('channel').send({embeds:[embed], components:[new ActionRowBuilder().addComponents(select)]});
            interaction.editReply('Setup done.');
        }
        
        // --- ADMIN COMMANDS ---
        else if (commandName === 'mute') {
            const user = options.getMember('user');
            let role = interaction.guild.roles.cache.find(r => r.name === 'Muted');
            if (!role) {
                try { role = await interaction.guild.roles.create({ name: 'Muted', color: '#000000', permissions: [] }); } catch (e) {}
            }
            interaction.guild.channels.cache.forEach(async (c) => { if (c.isTextBased()) await c.permissionOverwrites.edit(role, { SendMessages: false, AddReactions: false }).catch(()=>{}); });
            await user.roles.add(role);
            interaction.editReply(`Muted **${user.user.tag}**`);
            const ms = parseDuration(options.getString('duration'));
            if (ms) setTimeout(() => user.roles.remove(role).catch(() => {}), ms);
        }
        else if (commandName === 'ban') {
            const user = options.getMember('user');
            if(user.bannable) { await user.ban({ reason: options.getString('reason') }); interaction.editReply(`Banned **${user.user.tag}**`); }
            else interaction.editReply('Error: Cannot ban.');
        }
        else if (commandName === 'kick') {
            const user = options.getMember('user');
            if(user.kickable) { await user.kick(options.getString('reason')); interaction.editReply(`Kicked **${user.user.tag}**`); }
            else interaction.editReply('Error: Cannot kick.');
        }
        else if (commandName === 'unmute') {
            const user = options.getMember('user');
            const role = interaction.guild.roles.cache.find(r=>r.name==='Muted');
            if(role) await user.roles.remove(role);
            interaction.editReply(`Unmuted.`);
        }
        else if (commandName === 'lock') {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
            interaction.editReply('Locked.');
        }
        else if (commandName === 'unlock') {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
            interaction.editReply('Unlocked.');
        }
        // --- EMBED ---
        else if (commandName === 'embed') {
            const embed = new EmbedBuilder().setColor(options.getString('color') || '#0099FF');
            if (options.getString('title')) embed.setTitle(options.getString('title'));
            if (options.getString('description')) embed.setDescription(options.getString('description').replace(/\\n/g, '\n'));
            if (options.getString('image')) embed.setImage(options.getString('image'));
            if (options.getString('thumbnail')) embed.setThumbnail(options.getString('thumbnail'));
            if (options.getString('footer')) embed.setFooter({ text: options.getString('footer') });
            const ch = options.getChannel('channel') || interaction.channel;
            await ch.send({ content: options.getString('content') || null, embeds: [embed] });
            interaction.editReply({ content: 'Sent!', ephemeral: true });
        }
        // --- WELCOME SETUP ---
        else if (commandName === 'welcome-setup') {
            const cfg = guildSettings.get(interaction.guildId) || {};
            cfg.welcomeChannelId = options.getChannel('channel').id;
            cfg.welcomeMessage = options.getString('message');
            cfg.welcomeContent = options.getString('content');
            cfg.welcomeType = options.getString('type');
            cfg.welcomeImage = options.getString('image_url');
            cfg.welcomeColor = options.getString('color');
            guildSettings.set(interaction.guildId, cfg);
            interaction.editReply('Welcome set.');
        }
        else if (commandName === 'leave-setup') {
            const cfg = guildSettings.get(interaction.guildId) || {};
            cfg.leaveChannelId = options.getChannel('channel').id;
            cfg.leaveMessage = options.getString('message');
            guildSettings.set(interaction.guildId, cfg);
            interaction.editReply('Leave set.');
        }
        else if (commandName === 'autorole-setup') {
            const cfg = guildSettings.get(interaction.guildId) || {};
            cfg.autoRoleId = options.getRole('role').id;
            guildSettings.set(interaction.guildId, cfg);
            interaction.editReply(`Auto role: **${options.getRole('role').name}**`);
        }
        else if (commandName === 'autoreact-setup') {
            const cfg = guildSettings.get(interaction.guildId) || {};
            if (!cfg.autoReactRoles) cfg.autoReactRoles = new Map();
            cfg.autoReactRoles.set(options.getRole('role').id, options.getString('emoji'));
            guildSettings.set(interaction.guildId, cfg);
            interaction.editReply(`React setup.`);
        }
        else if (commandName === 'skullboard-setup') {
            const cfg = guildSettings.get(interaction.guildId) || {};
            cfg.skullboardId = options.getChannel('channel').id;
            guildSettings.set(interaction.guildId, cfg);
            interaction.editReply('Skullboard set.');
        }
        else if (commandName === 'boost-setup') {
            const cfg = guildSettings.get(interaction.guildId) || {};
            cfg.boostChannelId = options.getChannel('channel').id;
            cfg.boostMessage = options.getString('message');
            guildSettings.set(interaction.guildId, cfg);
            interaction.editReply('Boost set.');
        }
        else if (commandName === 'userinfo') {
            const user = options.getMember('user') || interaction.member;
            const embed = new EmbedBuilder().setTitle(`User: ${user.user.tag}`).addFields({name:'Joined', value:`<t:${Math.floor(user.joinedTimestamp/1000)}:R>`}).setColor(0x00AAFF);
            interaction.editReply({embeds:[embed]});
        }
        else if (commandName === 'avatar') {
            const user = options.getMember('user') || interaction.member;
            const embed = new EmbedBuilder().setTitle(`${user.user.username}'s Avatar`).setImage(user.displayAvatarURL({dynamic:true, size:4096})).setColor(0x00AAFF);
            interaction.editReply({embeds:[embed]});
        }
    } // End of ELSE block
    
  } catch(e) { console.error(e); }
});

// --- MEMBER EVENTS ---
client.on('guildMemberAdd', async member => {
  const config = guildSettings.get(member.guild.id);
  if (!config) return;
  if (config.autoRoleId) {
     const role = member.guild.roles.cache.get(config.autoRoleId);
     if (role) await member.roles.add(role).catch(console.error);
  }
  if (config.welcomeChannelId) {
    const ch = member.guild.channels.cache.get(config.welcomeChannelId);
    if (ch) {
        let msgText = (config.welcomeMessage || 'Welcome {user}!').replace(/{user}/g, member.toString()).replace(/{server}/g, member.guild.name).replace(/{count}/g, member.guild.memberCount);
        let contentText = (config.welcomeContent || 'Hello {user}').replace(/{user}/g, member.toString()).replace(/{server}/g, member.guild.name).replace(/{count}/g, member.guild.memberCount);
        if (config.welcomeType === 'embed') {
            const embed = new EmbedBuilder().setTitle(`Welcome`).setDescription(msgText).setThumbnail(member.user.displayAvatarURL()).setColor(config.welcomeColor || 0x00FF00);
            if (config.welcomeImage) embed.setImage(config.welcomeImage);
            ch.send({ content: contentText, embeds: [embed] });
        } else { ch.send(msgText); }
    }
  }
});

client.on('guildMemberRemove', async member => {
  const config = guildSettings.get(member.guild.id);
  if (config && config.leaveChannelId) {
    const ch = member.guild.channels.cache.get(config.leaveChannelId);
    if(ch) ch.send((config.leaveMessage||'Bye {user}').replace(/{user}/g, member.user.tag).replace(/{count}/g, member.guild.memberCount));
  }
});

// --- CRASH PREVENTION ---
process.on('unhandledRejection', (reason, p) => console.log('Anti-Crash: ', reason));
process.on('uncaughtException', (err, origin) => console.log('Anti-Crash: ', err));

// PASTE TOKEN HERE
console.log('Starting bot...');
client.login(process.env.DISCORD_TOKEN);
