'use strict';

require('dotenv').config();
const Telegraf = require('telegraf');
const Markup = require('telegraf/markup');
const Extra = require('telegraf/extra');


const bot = new Telegraf(process.env.BOT_TOKEN);
const request = require('request');
const API_URL = process.env.API_URL;

const state = {};


bot.start((ctx) => {
    ctx.reply('Welcome to the unofficial AllItBooks search and download bot. You can use the /search commands to interact with the bot')
    .then(() => ctx.reply('You can start using the bot searching for any topic i.e: /search vue'))
    .then(() => ctx.reply('To download a book just click the download action link /download_book_slug and the file will be sent to you'))
    .then(() => ctx.reply('Bot developed by @FridoxFL'))
});

bot.hears(/search/gi, (ctx) => {
    const searchTerm = ctx.message.text.split('/search ')[1];
    const userId = ctx.message.from.id;
    const user = state[userId];

    state[userId] = { term: searchTerm, page: 1 }

    return _performSearch(searchTerm, 1, ctx);
}).catch(err => console.log(err));


bot.on('callback_query', ctx => {
    const [action, searchTerm] = ctx.update.callback_query.data.split('::');
    const userId = ctx.update.callback_query.from.id;

    if (state[userId] && action === 'next') {
        state[userId].page += 1;
    } else if (state[userId] && action === 'prev') {
        state[userId].page -= 1;
    }

    ctx.answerCbQuery(`Looking for page ${state[userId].page} for ${searchTerm}`);

    return _performSearch(state[userId].term, state[userId].page, ctx)
});

bot.hears(/\/download/, (ctx) => {
    const bookSlug = ctx.message.text.split('/download_')[1].replace(/_/g, '-');
    return request(`${API_URL}/${bookSlug}`, (err, response, body) => {
        if (err) {
            console.log(err);
        }
        ctx.reply('Sending file...')
            .then(() => ctx.replyWithChatAction('upload_document'))
            .then(() => ctx.replyWithDocument({
                url: body,
                filename: `${bookSlug}.pdf`
            }))

    })
})


function _buildBooksList(books) {
    books = JSON.parse(books);
    return books.map(book => {
        return `➡️ <b>${book.title}</b>(${book.author})\n💾 <b>Download</b> /download_${book.downloadPath.replace(/-/g, '_')}`
    }).join('\n\n')
}

function _performSearch(searchTerm, page = 1, ctx) {
    return request(`${API_URL}/search?term=${searchTerm}&page=${page}`, (err, response, body) => {
        const booksList = _buildBooksList(body);
        if (err) {
            console.log(err);
        }
        ctx.replyWithHTML(booksList, Markup.inlineKeyboard([
            Markup.callbackButton('⏮️ Previous', `prev::${searchTerm}`),
            Markup.callbackButton('Next ⏭️', `next::${searchTerm}`)
        ]).extra());
    })
}


bot.launch();
