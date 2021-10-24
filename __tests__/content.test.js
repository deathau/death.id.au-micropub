
import content from '../src/libs/content'

describe('content', () => {
	const data = {
		'date': '2021-09-09T12:23:34.120Z',
		'name': 'Title',
		'category': [ 'one', 'two', 'three' ],
		'updated': '2021-10-09T12:23:34.120Z',
		'content': 'This is the content'
	}

	const output = '---\n' +
	'date: 2021-09-09T12:23:34.120Z\n' +
	'title: "Title"\n' +
	'tags:\n' +
	' - one\n' +
	' - two\n' +
	' - three\n' +
	'updated: 2021-10-09T12:23:34.120Z\n' +
	'---\n' +
	'\n' +
	'This is the content'

	describe('output', () => {
		test('standard post', () => {
			const fm = content.output(data)
			expect(fm).toBe(output)
		})

		test('deleted post', () => {
			data.deleted = true
			const fm = content.output(data)
			expect(fm).toContain('\ndeleted: true\n')
		})

		test('draft post', () => {
			data.draft = true
			const fm = content.output(data)
			expect(fm).toContain('\ndraft: true\n')
		})

		test('no tags', () => {
			delete data.category
			const fm = content.output(data)
			expect(fm).not.toContain('\ntags:')
		})

		test('like post', () => {
			data['like-of'] = true
			const fm = content.output(data)
			expect(fm).toContain('\nlike-of:')
		})

		test('null data', () => {
			const fm = content.output()
			expect(fm).toBeFalsy()
		})
	})

	describe('format', () => {
		test('set create date', () => {
			delete data.date
			delete data.updated
			const formatted = content.format(data)
			expect(formatted.data).toHaveProperty('date')
		})

		test('set updated date', () => {
			delete data.updated
			const formatted = content.format(data)
			expect(formatted.data).toHaveProperty('updated')
		})

		test('change updated date', () => {
			const updated = '2021-10-09T12:23:34.120Z'
			data.updated = updated
			const formatted = content.format(data)
			expect(formatted.data.updated).not.toBe(updated)
		})

		test('is post', () => {
			const formatted = content.format(data)
			expect(formatted).toHaveProperty('slug')
			expect(formatted.slug).toMatch(/^posts\/.*/)
			expect(formatted).toHaveProperty('filename')
			expect(formatted.filename).toMatch(/^src\/posts\/.*/)
			expect(formatted.filename).toBe(`src/${formatted.slug}.md`)
		})

		test('is note', () => {
			delete data.name
			const formatted = content.format(data)
			expect(formatted).toHaveProperty('slug')
			expect(formatted.slug).toMatch(/^notes\/.*/)
			expect(formatted).toHaveProperty('filename')
			expect(formatted.filename).toMatch(/^src\/notes\/.*/)
			expect(formatted.filename).toBe(`src/${formatted.slug}.md`)
		})
	})

	describe('mediaFilename', () => {
		const file = {
			filename: 'image.png'
		}
		test('valid image', () => {
			const filename = content.mediaFilename(file)
			expect(filename).toMatch(/^uploads\//)
			expect(filename).toMatch(`_${file.filename}`)
		})

		test('invalid image', () => {
			const filename = content.mediaFilename({})
			expect(filename).toBeFalsy()
		})
	})
})