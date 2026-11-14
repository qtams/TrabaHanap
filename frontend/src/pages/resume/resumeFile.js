export const ACCEPT = '.pdf,.docx'
export const MAX_MB = 10

// Returns an error string, or null when the file is fine.
export function checkFile(file) {
  if (!/\.(pdf|docx)$/i.test(file.name)) return 'Only PDF and DOCX files are supported.'
  if (file.size > MAX_MB * 1024 * 1024) return `File is larger than ${MAX_MB} MB.`
  return null
}
