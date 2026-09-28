/** Run from cms/studio: npx sanity exec scripts/import-speakers.mjs --with-user-token
 * Repeat-safe initial import; existing documents are never overwritten.
 * Source is the pre-migration Git snapshot, not a frontend fallback dataset.
 */
import {execFileSync} from 'node:child_process'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-02-19'}).withConfig({projectId: 'm3oobx03', dataset: 'production', useCdn: false})
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {encoding: 'utf8'}).trim()
const source = execFileSync('git', ['show', '89314a6b5e703d2c9c893d01a4c6cef9f97f5401:website/index.html'], {cwd: root, encoding: 'utf8'})
const section = source.slice(source.indexOf('<div class="speakers-grid"'), source.indexOf('<!-- Countdown to the next speaker wave -->'))
const cards = [...section.matchAll(/<div class="speaker-card">([\s\S]*?)<\/h3><p class="speaker-role">([^<]*)<\/p><p class="speaker-company">([^<]*)<\/p>/g)]
if (cards.length !== 2) throw new Error('Expected exactly two source speakers; refusing import.')
const decode = (value) => value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'")
async function main() {
  for (const [index, match] of cards.entries()) {
    const markup = match[1]
    const portrait = markup.match(/src="([^"]+)" alt="([^"]+)"/)
    const name = markup.match(/<h3 class="speaker-name">([^<]*)$/)
    const badge = markup.match(/speaker-logo-badge--text">([^<]*)</)
    if (!portrait || !name || !badge) throw new Error('Source card missing required fields.')
    const sourceKey = portrait[1].split('/').pop().replace(/\.[^.]+$/, '').replaceAll('_', '-')
    const id = `speaker-${sourceKey}`
    const existing = await client.fetch('*[_id in $ids]{_id}', {ids: [id, `drafts.${id}`]})
    if (existing.length) { console.log(`Skipped existing speaker ${id}`); continue }
    const asset = await client.assets.upload('image', await readFile(resolve(root, 'website', portrait[1])), {filename: portrait[1].split('/').pop()})
    await client.createIfNotExists({
      _id: id, _type: 'speaker', name: decode(name[1]), role: decode(match[2]), companyName: decode(match[3]),
      portrait: {_type: 'image', asset: {_type: 'reference', _ref: asset._id}}, portraitAlt: decode(portrait[2]),
      badgeText: decode(badge[1]), sortOrder: index + 1, visible: true,
    })
    console.log(`Imported ${id}`)
  }
  const result = await client.fetch('*[_type == "speaker" && _id in ["speaker-stefan-ruehl", "speaker-kevin-kantert"]] | order(sortOrder asc){_id,name,sortOrder,portraitAlt,"portraitUrl":portrait.asset->url}')
  console.log(JSON.stringify(result, null, 2))
  if (result.length !== 2 || result.some((s) => !s.portraitUrl)) throw new Error('Import verification failed: expected two published speakers with portraits.')
}
main().catch((error) => { console.error(error.message); process.exitCode = 1 })
