const removeLineBreaks = str => str.replace(/(\r\n|\n|\r)/gm, '')

const removeDuplicateSpaces = str => str.replace(/\s+/g, ' ').trim()

export function cleanMessageContent(text) {
  return removeDuplicateSpaces(removeLineBreaks(text))
}

export function cleanTitle(title) {
  return title.replace(/\s*-\s*Youtube\s*$/i, '')
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
