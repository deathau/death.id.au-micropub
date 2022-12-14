import dotenv from 'dotenv'
import { Error, Response } from './libs/response'
import got from 'got'
import content from './libs/content'
import GitHub from './libs/github'
import simpleGit from 'simple-git'
import fs from 'fs'
import path from 'path'
const { schedule } = require("@netlify/functions")
const { mf2 } = require("microformats-parser");

dotenv.config()

const collapsemf2properties = (obj) => {
    return Object.fromEntries(
        Object.entries(obj)
            // filter out empty entries
            .filter(([key, value]) => (!Array.isArray(value) && !!value) || value.every(v => v))
            // if entry is an array of length 1, collapse it to just key:value
            .map(([key, value], index) => Array.isArray(value) && value.length == 1 ? [key, value[0]] : [key, value])
    )
}

const handler = async function(event, context) {

    const repoDir = `./repository`
    const inboxDir = (process.env.INBOX_DIR || 'src').replace(/\/$/, '')

    if(fs.existsSync(repoDir)) fs.rmSync(repoDir, { recursive: true })
    fs.mkdirSync(repoDir, { recursive: true })
    const git = simpleGit({
        baseDir: repoDir
        // config: [
        //     `Authorization: token ${process.env.GIT_TOKEN}`
        // ]
    });
    await git.clone(`https://${process.env.GIT_TOKEN}@github.com/${process.env.GITHUB_USER}/${process.env.GITHUB_REPO}.git`, './');
    await git.checkout(process.env.GIT_BRANCH)
    if(!fs.existsSync(`${repoDir}/${inboxDir}`)) fs.mkdirSync(`${repoDir}/${inboxDir}`, { recursive:true })

    let since = new Date(0)
    try{
        since = new Date(await fs.promises.readFile(`${repoDir}/${inboxDir}/.since`, 'utf8'))
    }
    catch(err) {
        since = new Date(0)
    }
    if(!since) since = new Date(0)

    const options = {
        headers: {
            'accept': 'application/activity+json',
        },
        responseType: 'json',
        method: 'GET',
        searchParams: {
            domain: 'death.id.au',
            token: process.env.WEBMENTION_TOKEN,
            since: since.toISOString()
        }
    }

    const { body } = await got(`https://webmention.io/api/mentions.jf2`, options)
    const outputs = []
    for(const element of body.children) {

        if(element["wm-source"]) {
            try{
                let url = new URL(element["wm-source"]);
                const { body, headers } = await got(element["wm-source"], { method:'GET' })

                if(headers["content-type"].startsWith("text/htm")){
                    // if html, attempt to parse microformats
                    const parsed = mf2(body, { baseUrl: url.origin })
                    if(parsed.items.length > 0){
                        const properties = collapsemf2properties(parsed.items[0].properties)
                        const author = { ... collapsemf2properties(properties.author.properties), ...element.author}
                        element = { ...properties, ...element, author }
                    }                
                }
                else if(headers["content-type"].startsWith("application/json") || headers["content-type"].startsWith("application/activity+json") || headers["content-type"].startsWith("application/ld+json")) {
                    // if json, parse json
                    const properties = JSON.parse(body)
                    element = { ...properties, ...element }
                }
            }
            catch(err) { }
        }

        if(element.name && element.content.text && element.content.text.replace('\n', '').startsWith(element.name)){
            delete element.name
        }
        const output = content.format(element, "webmention.io", inboxDir, 'html')
        
        const dir = path.dirname(`${repoDir}/${output.filename}`)
        if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive:true })
        fs.writeFileSync(`${repoDir}/${output.filename}`, output.formatted)
        await git.add(output.filename)
        outputs.push(output.filename)
    };

    if(outputs.length > 0) {
        fs.writeFileSync(`${repoDir}/${inboxDir}/.since`, new Date( Date.now() - 5000 * 60 ).toISOString())
        await git.add(`${inboxDir}/.since`)
        await git.commit(`Added ${outputs.length} new webmentions`, [...outputs, `${inboxDir}/.since`])
        //await git.push()
    }
    // fs.rmSync(repoDir, { recursive: true })

    return {
		'statusCode': 200,
		'headers': {
			'Content-Type': 'application.json'
		},
		'body': JSON.stringify(outputs, null, 2)
	}
};

if(process.env.WEBMENTION_TOKEN)
exports.handler = schedule("@hourly", handler);