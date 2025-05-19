// netlify/functions/create-bins.js
const fetch = require('node-fetch')

exports.handler = async () => {
  const masterKey = process.env.JSONBIN_KEY
  if (!masterKey) return { statusCode: 500, body: 'Missing JSONBIN_KEY' }

  const create = async name => {
    const res = await fetch('https://api.jsonbin.io/v3/b', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': masterKey,
        'X-Bin-Name': name
      },
      body: JSON.stringify([])
    })
    if (!res.ok) throw new Error(await res.text())
    const { metadata } = await res.json()
    return metadata.id
  }

  try {
    const signalsId = await create('signals')
    const tradesId  = await create('trades')
    return {
      statusCode: 200,
      body: JSON.stringify({ signalsId, tradesId })
    }
  } catch (e) {
    return { statusCode: 500, body: e.message }
  }
}
