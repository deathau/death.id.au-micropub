
import matter from 'gray-matter'
import { utils } from './utils'

const renameProperties = {
	'name': 'title',
	'category': 'tags'
}

const ignoreProperties = [
	'content', 'photo'
]

const content = {
	output: (data, clientId) => {
		if (!data) {
			return null
		}

		let output = {}
		for (let [key, value] of Object.entries(data)) {
			if (!ignoreProperties.includes(key)) {
				output[renameProperties[key] || key] = value
			}
		}
		if (clientId) {
			output['client_id'] = clientId
		}

		const body = data.content ? data.content.html || data.content : '';

		return matter.stringify(body || '', output)
	},

	format: (data, clientId, dir, ext) => {
		if (!data) {
			return null
		}
		const date = new Date()
		if (!data.date) {
			data.date = date.toISOString()
		} else {
			data.updated = date.toISOString()
		}
		const type = content.getType(data) || ''
		let slugParts = []
		if (process.env.FILENAME_FULL_DATE) { // Jekyll post filenames must have YYYY-MM-DD in the filename
			slugParts.push(date.toISOString().substr(0, 10)) // or split('T')[0]
		}
		if (data.slug) {
			slugParts.push(utils.slugify(data.slug))
		} else if (data.name) {
			slugParts.push(utils.slugify(data.name))
		} else if (data["wm-id"]) {
			slugParts.push(`wm-${data["wm-id"]}`)
		} else {
			slugParts.push(Math.round(date / 1000))
		}
		const slug = slugParts.join('-')
		if(!dir) dir = (process.env.CONTENT_DIR || 'src').replace(/\/$/, '')
		if(!ext) ext = 'md'
		const filename = `${dir}/${type}/${slug}.${ext}`

		return {
			'filename': filename,
			'slug': `${type}/${slug}`,
			'formatted': content.output(data, clientId),
			'data': data
		}
	},

	getType: data => {
		if (!utils.objectHasKeys(data)) {
			return null
		}
		if (data['like-of']) {
			return 'likes'
		}
		if (data['bookmark-of']) {
			return 'bookmarks'
		}
		if (data['rsvp'] && data['in-reply-to']) {
			return 'rsvp'
		}
		if (data['name']) {
			return 'articles'
		}
		if (data['u-watch-of']) {
			return 'watched'
		}
		if (data['follow-of']) {
			return 'follows'
		}
		return 'notes'
	},

	mediaFilename: file => {
		if (file && file.filename) {
			let dir = (process.env.MEDIA_DIR || 'uploads').replace(/\/$/, '')
			return `${dir}/${Math.round(new Date() / 1000)}_${file.filename}`
		}
	}
}

export default content
