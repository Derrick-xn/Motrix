export const resolve = (...args) => args.filter(Boolean).join('/')
export const join = (...args) => args.filter(Boolean).join('/')
export const dirname = (p) => p ? p.substring(0, p.lastIndexOf('/')) : ''
export const basename = (p, ext) => {
  const base = p ? p.substring(p.lastIndexOf('/') + 1) : ''
  if (ext && base.endsWith(ext)) return base.slice(0, -ext.length)
  return base
}
export const extname = (p) => {
  const dot = p ? p.lastIndexOf('.') : -1
  return dot > 0 ? p.substring(dot) : ''
}
export const sep = '/'
export const delimiter = ':'
export const isAbsolute = (p) => p ? p.startsWith('/') : false
export const normalize = (p) => p
export const relative = (from, to) => to
export const parse = (p) => ({
  root: '/',
  dir: dirname(p),
  base: basename(p),
  ext: extname(p),
  name: basename(p, extname(p))
})

export default {
  resolve,
  join,
  dirname,
  basename,
  extname,
  sep,
  delimiter,
  isAbsolute,
  normalize,
  relative,
  parse
}
