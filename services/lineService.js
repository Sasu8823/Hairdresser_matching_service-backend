// backend/services/lineService.js
const line = require('@line/bot-sdk');

const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

// Send message to user
async function sendMessage(userId, messageText) {
    try {
        await client.pushMessage(userId, {
            type: 'text',
            text: messageText,
        });
        console.log('✅ Message sent to user:', userId);
    } catch (err) {
        console.error('❌ Failed to send LINE message:', err);
    }
}

// Send Flex Message
async function sendFlexMessage(userId, altText, flexContent) {
    try {
        await client.pushMessage(userId, {
            type: 'flex',
            altText: altText,
            contents: flexContent,
        });
        console.log('✅ Flex message sent to user:', userId);
    } catch (err) {
        console.error('❌ Failed to send Flex message:', err);
    }
}

// Create Rich Menu
async function createRichMenu() {
    const richMenu = {
        size: {
            width: 2500,
            height: 1686
        },
        selected: false,
        name: "SALOMO Main Menu",
        chatBarText: "メニュー",
        areas: [{
                bounds: {
                    x: 0,
                    y: 0,
                    width: 1250,
                    height: 843
                },
                action: {
                    type: "uri",
                    uri: "https://liff.line.me/2007683839-YM9j8eej"
                }
            },
            {
                bounds: {
                    x: 1250,
                    y: 0,
                    width: 1250,
                    height: 843
                },
                action: {
                    type: "postback",
                    data: "action=view_requests"
                }
            },
            {
                bounds: {
                    x: 0,
                    y: 843,
                    width: 1250,
                    height: 843
                },
                action: {
                    type: "postback",
                    data: "action=view_matchings"
                }
            },
            {
                bounds: {
                    x: 1250,
                    y: 843,
                    width: 1250,
                    height: 843
                },
                action: {
                    type: "postback",
                    data: "action=help"
                }
            }
        ]
    };

    try {
        const richMenuId = await client.createRichMenu(richMenu);
        console.log('✅ Rich menu created:', richMenuId);
        return richMenuId;
    } catch (err) {
        console.error('❌ Failed to create rich menu:', err);
        throw err;
    }
}

// Set Rich Menu Image
async function setRichMenuImage(richMenuId, imageBuffer) {
    try {
        await client.setRichMenuImage(richMenuId, imageBuffer);
        console.log('✅ Rich menu image set:', richMenuId);
    } catch (err) {
        console.error('❌ Failed to set rich menu image:', err);
        throw err;
    }
}

// Set Default Rich Menu
async function setDefaultRichMenu(richMenuId) {
    try {
        await client.setDefaultRichMenu(richMenuId);
        console.log('✅ Default rich menu set:', richMenuId);
    } catch (err) {
        console.error('❌ Failed to set default rich menu:', err);
        throw err;
    }
}

// Create welcome message
function createWelcomeMessage() {
    return {
        type: 'flex',
        altText: 'SALOMOへようこそ！',
        contents: {
            type: 'bubble',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [{
                        type: 'text',
                        text: 'SALOMO',
                        weight: 'bold',
                        size: 'xl',
                        color: '#1DB446'
                    },
                    {
                        type: 'text',
                        text: '美容師マッチングサービス',
                        size: 'sm',
                        color: '#666666'
                    }
                ]
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [{
                        type: 'text',
                        text: 'こんにちは！SALOMOへようこそ！',
                        weight: 'bold',
                        size: 'md',
                        margin: 'md'
                    },
                    {
                        type: 'text',
                        text: '美容師・ネイリスト・アイリストと簡単にマッチングできます。',
                        size: 'sm',
                        color: '#666666',
                        margin: 'md'
                    },
                    {
                        type: 'separator',
                        margin: 'lg'
                    },
                    {
                        type: 'text',
                        text: '📱 施術希望を投稿',
                        size: 'sm',
                        margin: 'md'
                    },
                    {
                        type: 'text',
                        text: '💰 予算に応じたランク制',
                        size: 'sm',
                        margin: 'sm'
                    },
                    {
                        type: 'text',
                        text: '💬 マッチング後のチャット機能',
                        size: 'sm',
                        margin: 'sm'
                    }
                ]
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                contents: [{
                    type: 'button',
                    action: {
                        type: 'uri',
                        label: 'サービスを開始',
                        uri: 'https://liff.line.me/2007683839-YM9j8eej'
                    },
                    style: 'primary',
                    color: '#1DB446'
                }]
            }
        }
    };
}

// Create matching notification message
function createMatchingNotification(customerName, stylistName, menu, date, time) {
    return {
        type: 'flex',
        altText: 'マッチングが成立しました！',
        contents: {
            type: 'bubble',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [{
                    type: 'text',
                    text: '🎉 マッチング成立！',
                    weight: 'bold',
                    size: 'lg',
                    color: '#1DB446'
                }]
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [{
                        type: 'text',
                        text: `${customerName}さんと${stylistName}さんのマッチングが成立しました！`,
                        size: 'md',
                        margin: 'md',
                        wrap: true
                    },
                    {
                        type: 'separator',
                        margin: 'lg'
                    },
                    {
                        type: 'text',
                        text: `📅 日時: ${date} ${time}`,
                        size: 'sm',
                        margin: 'md'
                    },
                    {
                        type: 'text',
                        text: `✂️ メニュー: ${menu}`,
                        size: 'sm',
                        margin: 'sm'
                    }
                ]
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                contents: [{
                    type: 'button',
                    action: {
                        type: 'uri',
                        label: '詳細を確認',
                        uri: 'https://liff.line.me/2007683839-YM9j8eej'
                    },
                    style: 'primary',
                    color: '#1DB446'
                }]
            }
        }
    };
}

module.exports = {
    sendMessage,
    sendFlexMessage,
    createRichMenu,
    setRichMenuImage,
    setDefaultRichMenu,
    createWelcomeMessage,
    createMatchingNotification
};