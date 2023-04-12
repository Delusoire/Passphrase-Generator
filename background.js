import { EFFLongWordList } from "./wordlist.js"

function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1)
}

function randomNumber(min, max) {
    let rval = 0
    const range = max - min + 1
    const bitsNeeded = Math.ceil(Math.log2(range))
    if (bitsNeeded > 53) {
        throw new Error("We cannot generate numbers larger than 53 bits.")
    }

    const bytesNeeded = Math.ceil(bitsNeeded / 8)
    const mask = Math.pow(2, bitsNeeded) - 1
    // 7776 -> (2^13 = 8192) -1 == 8191 or 0x00001111 11111111

    // Fill a byte array with N random numbers
    const byteArray = new Uint8Array(bytesNeeded)
    self.crypto.getRandomValues(byteArray)

    let p = (bytesNeeded - 1) * 8
    for (let i = 0; i < bytesNeeded; i++) {
        rval += byteArray[i] * Math.pow(2, p)
        p -= 8
    }

    // Use & to apply the mask and reduce the number of recursive lookups
    rval = rval & mask

    if (rval >= range) {
        // Integer out of acceptable range
        return randomNumber(min, max)
    }

    // Return an integer that falls within the range
    return min + rval
}

// Use niceware instead?
function generatePassphrase(ppo) {
    const listLength = EFFLongWordList.length - 1
    const wordList = new Array(ppo.numWords)

    for (let i = 0; i < ppo.numWords; i++) {
        const wordIndex = randomNumber(0, listLength)
        wordList[i] = capitalize(EFFLongWordList[wordIndex])
    }

    const randomIndex = randomNumber(0, wordList.length - 1)
    wordList[randomIndex] = wordList[randomIndex] + randomNumber(0, 9)

    return wordList.join(ppo.wordSeparator)
}

const ppo = {
    numWords: 5,
    wordSeparator: "-",
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "generatePassphrase",
        title: "Generate passphrase",
        contexts: ["all"],
    })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
    const pp = generatePassphrase(ppo)

    const copy = toCopy => navigator.clipboard.writeText(toCopy)
    const insert = toInsert =>
        document.execCommand("insertText", false, toInsert)

    const execFunc = (func, args) =>
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func,
            args: [pp],
        })

    if (tab?.id) execFunc(copy, [pp])
    if (info.editable) execFunc(insert, [pp])
    else throw Error("Tab ID is null")
})
