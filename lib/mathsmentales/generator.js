/**
 * MathsMentales Question Generator
 * Code original de MathsMentales.net adapté pour Next.js
 * Source: https://forge.apps.education.fr/mathsmentales/mathsmentales.forge.apps.education.fr
 * Licence: Apache 2.0
 */

// ============================================
// UTILS - Fonctions utilitaires
// ============================================

const _ = {
  isArray: (o) => Object.prototype.toString.call(o) === '[object Array]',
  isObject: (o) => Object.prototype.toString.call(o) === '[object Object]',
  isString: (o) => Object.prototype.toString.call(o) === '[object String]',
}

const utils = {
  security: 300,

  checkSecurity() {
    this.security--
    return this.security > 0
  },

  alea() {
    return Math.random()
  },

  clone(obj) {
    if (obj === null || typeof obj !== 'object') return obj
    if (Array.isArray(obj)) return obj.map(item => this.clone(item))
    const cloned = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.clone(obj[key])
      }
    }
    return cloned
  },

  shuffle(array) {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  },

  debug(...args) {
    console.log(...args)
  }
}

// ============================================
// MATH - Fonctions mathématiques
// ============================================

const math = {
  premiers: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199],

  round(nb, precision) {
    if (precision === undefined) {
      return Math.round(nb)
    } else {
      return Number(Math.round(Number(nb + 'e' + precision)) + 'e' + (-precision))
    }
  },

  aleaInt(min, max, ...others) {
    let qty = 1
    let avoid = []
    let arrayType = false
    utils.security = 300
    let nodouble = false
    let notPrime = false

    for (let i = 0; i < others.length; i++) {
      if (String(Number(others[i])) === others[i] || typeof others[i] === "number") {
        qty = others[i]
        arrayType = true
      } else if (typeof others[i] === "string" && others[i][0] === "^") {
        avoid = others[i].substring(1).split(",")
        if (avoid.indexOf("&") > -1) {
          nodouble = true
          avoid.splice(avoid.indexOf("&"), 1)
        }
        if (avoid.indexOf("prime") > -1) {
          notPrime = true
          avoid.splice(avoid.indexOf("prime"), 1)
        }
        avoid = avoid.map(Number)
      }
    }

    if (min === max) return min
    if (max < min) {
      [min, max] = [max, min]
    }

    if (arrayType) {
      const integers = []
      for (let i = 0; i < qty; i++) {
        let thisint = math.round(utils.alea() * (max - min)) + min
        if (avoid.indexOf(thisint) > -1 || (nodouble && integers.indexOf(thisint) > -1) || (notPrime && math.premiers.includes(thisint))) {
          i--
          if (!utils.checkSecurity()) break
          continue
        }
        integers.push(thisint)
        if (!utils.checkSecurity()) break
      }
      return integers
    } else {
      let thisint
      do {
        thisint = math.round(utils.alea() * (max - min)) + min
        if (!utils.checkSecurity()) break
      } while (avoid.indexOf(thisint) > -1 || (notPrime && math.premiers.indexOf(thisint) > -1))
      return thisint
    }
  },

  aleaFloat(min, max, precision, ...others) {
    let qty = 1
    let avoid = []
    let nodouble = false
    utils.security = 300

    for (let i = 0; i < others.length; i++) {
      if (String(Number(others[i])) === others[i] || typeof others[i] === "number") {
        qty = others[i]
      } else if (typeof others[i] === "string" && others[i][0] === "^") {
        avoid = others[i].substring(1).split(",")
        if (avoid.indexOf("&") > -1) nodouble = true
        avoid = avoid.map(Number)
      }
    }

    if (max < min) {
      [min, max] = [max, min]
    }

    if (qty > 1) {
      let nb
      const floats = []
      for (let i = 0; i < qty; i++) {
        nb = math.round(utils.alea() * (max - min) + min, precision)
        if (avoid.indexOf(nb) > -1 || (nodouble && floats.indexOf(nb) > -1)) {
          i--
          if (!utils.checkSecurity()) break
          continue
        }
        floats.push(nb)
        if (!utils.checkSecurity()) break
      }
      return floats
    } else {
      let nb
      do {
        nb = math.round(utils.alea() * (max - min) + min, precision)
        if (!utils.checkSecurity()) break
      } while (avoid.indexOf(nb) > -1)
      return nb
    }
  },

  sign(nb) {
    nb = Number(nb)
    if (nb < 0) return "-"
    else return "+"
  },

  signedNumber(nb) {
    nb = Number(nb)
    if (nb === 0) return ""
    else if (nb > 0) return "+" + nb
    else return nb
  },

  nP(nb) {
    if (String(nb)[0] === "-") return "(" + nb + ")"
    else return nb
  },

  pgcd(a, b) {
    if (b) return math.pgcd(b, a % b)
    else return Math.abs(a)
  },

  ppcm(a, b) {
    const pgcd = math.pgcd(a, b)
    return (a * b) / pgcd
  },

  listeDiviseurs(nb, array = false) {
    if (nb < 0) nb = -nb
    const maxSearch = Math.floor(Math.sqrt(nb))
    const diviseurs = []
    const grandsdiviseurs = []
    for (let i = 1; i <= maxSearch; i++) {
      if (nb % i === 0) {
        diviseurs.push(i)
        if (i !== nb / i) grandsdiviseurs.unshift(nb / i)
      }
    }
    const result = diviseurs.concat(grandsdiviseurs)
    if (array === true) return result
    else return result.join("; ")
  },

  unDiviseur(nb, notOne = false, notNb = true) {
    if (Number(nb) === 0) return math.aleaInt(1, 10)
    if (Number(nb) === 1) return 1
    let diviseurs = math.listeDiviseurs(nb, true)
    if (notOne) diviseurs = diviseurs.slice(1)
    if (notNb && diviseurs.length > 1) diviseurs = diviseurs.slice(0, -1)
    return diviseurs[math.aleaInt(0, diviseurs.length - 1)]
  },

  fractionSimplifiee(n, d) {
    if (n < 0 && d < 0 || n > 0 && d < 0) {
      n = -n; d = -d
    }
    const gcd = math.pgcd(n, d)
    if (Number.isInteger(n / d)) return n / d
    else return "\\dfrac{" + (n / gcd) + "}{" + (d / gcd) + "}"
  },

  NumberToLetter(nombre, U = null, D = null) {
    const letter = {
      0: "zéro", 1: "un", 2: "deux", 3: "trois", 4: "quatre",
      5: "cinq", 6: "six", 7: "sept", 8: "huit", 9: "neuf",
      10: "dix", 11: "onze", 12: "douze", 13: "treize", 14: "quatorze",
      15: "quinze", 16: "seize", 17: "dix-sept", 18: "dix-huit", 19: "dix-neuf",
      20: "vingt", 30: "trente", 40: "quarante", 50: "cinquante",
      60: "soixante", 70: "soixante-dix", 80: "quatre-vingt", 90: "quatre-vingt-dix",
    }

    let nb = parseFloat(nombre.toString().replace(/ /gi, ""))
    if (isNaN(nb)) return "Nombre non valide"

    if (Math.ceil(nb) !== nb) {
      const parts = nombre.toString().split('.')
      return this.NumberToLetter(parts[0]) + " virgule " + this.NumberToLetter(parts[1])
    }

    const n = nb.toString().length
    let numberToLetter = ''
    let quotient, reste

    switch (n) {
      case 1:
        numberToLetter = letter[nb]
        break
      case 2:
        if (nb > 19) {
          quotient = Math.floor(nb / 10)
          reste = nb % 10
          if (nb < 71 || (nb > 79 && nb < 91)) {
            if (reste === 0) numberToLetter = letter[quotient * 10]
            if (reste === 1) numberToLetter = letter[quotient * 10] + "-et-" + letter[reste]
            if (reste > 1) numberToLetter = letter[quotient * 10] + "-" + letter[reste]
          } else numberToLetter = letter[(quotient - 1) * 10] + "-" + letter[10 + reste]
        } else numberToLetter = letter[nb]
        break
      case 3:
        quotient = Math.floor(nb / 100)
        reste = nb % 100
        if (quotient === 1 && reste === 0) numberToLetter = "cent"
        if (quotient === 1 && reste !== 0) numberToLetter = "cent-" + this.NumberToLetter(reste)
        if (quotient > 1 && reste === 0) numberToLetter = letter[quotient] + "-cents"
        if (quotient > 1 && reste !== 0) numberToLetter = letter[quotient] + "-cent-" + this.NumberToLetter(reste)
        break
      default:
        if (n <= 6) {
          quotient = Math.floor(nb / 1000)
          reste = nb - quotient * 1000
          if (quotient === 1 && reste === 0) numberToLetter = "mille"
          if (quotient === 1 && reste !== 0) numberToLetter = "mille-" + this.NumberToLetter(reste)
          if (quotient > 1 && reste === 0) numberToLetter = this.NumberToLetter(quotient) + "-mille"
          if (quotient > 1 && reste !== 0) numberToLetter = this.NumberToLetter(quotient) + "-mille-" + this.NumberToLetter(reste)
        }
    }

    if (numberToLetter.endsWith("quatre-vingt")) numberToLetter += "s"
    return numberToLetter
  }
}

// Alias MMmath pour compatibilité
const MMmath = math

// ============================================
// ACTIVITY - Classe de génération
// ============================================

class Activity {
  constructor(obj) {
    if (_.isObject(obj)) {
      this.setParams(obj)
    }
  }

  setParams(obj) {
    this.id = obj.id || obj.ID
    this.type = obj.type
    this.title = obj.title
    this.description = obj.description
    this.speech = obj.speech || false
    this.vars = obj.vars
    this.consts = obj.consts
    this.repeat = obj.repeat || false
    this.options = utils.clone(obj.options) || undefined
    this.questionPatterns = utils.clone(obj.questionPatterns) || obj.question
    this.answerPatterns = utils.clone(obj.answerPatterns) || obj.answer
    this.valuePatterns = utils.clone(obj.valuePatterns) || obj.value
    this.audioQuestionPatterns = utils.clone(obj.audioQuestionPatterns) || obj.audio || false
    this.questions = []
    this.answers = []
    this.values = []
    this.audios = []
    this.chosenOptions = []
    this.chosenQuestions = {}
    this.chosenQuestionTypes = []
    this.keys = obj.keys || []
  }

  initialize() {
    this.questions = []
    this.answers = []
    this.values = []
    this.audios = []
    this.intVarsHistoric = {}
    this.arraysHistoric = {}
    this.getOptionHistory = []
    this.getPatternHistory = { global: [] }
  }

  getOption() {
    if (!this.options) return false
    let ret = 0
    if (this.getOptionHistory.length === 0) {
      if (this.chosenOptions.length === 1) {
        this.getOptionHistory = utils.clone(this.chosenOptions)
      } else if (this.chosenOptions.length > 1) {
        this.getOptionHistory = utils.shuffle(utils.clone(this.chosenOptions))
      } else {
        this.getOptionHistory = utils.shuffle(Array.from(Array(this.options.length).keys()))
      }
    }
    ret = this.getOptionHistory[0]
    this.getOptionHistory.shift()
    return ret
  }

  getPattern(option) {
    if (this.chosenQuestionTypes.length > 0) {
      if (this.getPatternHistory.global.length === 0) {
        this.getPatternHistory.global = utils.shuffle(utils.clone(this.chosenQuestionTypes))
      }
      const ret = this.getPatternHistory.global[0]
      this.getPatternHistory.global.shift()
      return ret
    }

    if (option === false && Array.isArray(this.questionPatterns)) {
      if (this.getPatternHistory.global.length === 0) {
        this.getPatternHistory.global = utils.shuffle(Array.from(Array(this.questionPatterns.length).keys()))
      }
      const ret = this.getPatternHistory.global[0]
      this.getPatternHistory.global.shift()
      return ret
    }

    if (option === false) return false

    if (!Array.isArray(this.chosenQuestions[option])) {
      this.chosenQuestions[option] = []
    }
    if (!Array.isArray(this.getPatternHistory[option])) {
      this.getPatternHistory[option] = []
    }

    if (this.chosenQuestions[option].length === 0 && Array.isArray(this.options[option].question)) {
      if (this.getPatternHistory[option].length === 0) {
        this.getPatternHistory[option] = utils.shuffle(Array.from(Array(this.options[option].question.length).keys()))
      }
      const ret = this.getPatternHistory[option][0]
      this.getPatternHistory[option].shift()
      return ret
    } else if (this.chosenQuestions[option].length === 0 && !this.options[option].question && Array.isArray(this.questionPatterns)) {
      if (this.getPatternHistory.global.length === 0) {
        this.getPatternHistory.global = utils.shuffle(Array.from(Array(this.questionPatterns.length).keys()))
      }
      const ret = this.getPatternHistory.global[0]
      this.getPatternHistory.global.shift()
      return ret
    } else if (this.chosenQuestions[option].length > 0) {
      if (this.getPatternHistory[option].length === 0) {
        this.getPatternHistory[option] = utils.shuffle(utils.clone(this.chosenQuestions[option]))
      }
      const ret = this.getPatternHistory[option][0]
      this.getPatternHistory[option].shift()
      return ret
    }
    return false
  }

  replaceQuestionInAnswer(answer, question) {
    const regex = /:question(\|(\-{0,1}(\d)+))*/

    if (_.isArray(answer) && _.isArray(question)) {
      for (const [index, ans] of answer.entries()) {
        const detection = ans.match(regex)
        if (detection !== null) {
          if (detection[2] !== undefined) {
            const numberOfCaracteresToDelete = -Number(detection[2])
            if (numberOfCaracteresToDelete < 0)
              answer[index] = ans.replace(regex, question[index].slice(0, numberOfCaracteresToDelete))
            else
              answer[index] = ans.replace(regex, question[index].slice(numberOfCaracteresToDelete))
          } else {
            answer[index] = ans.replace(regex, question[index])
          }
        }
      }
      return answer
    } else if (_.isString(answer) && _.isArray(question)) {
      const detection = answer.match(regex)
      if (detection !== null) {
        const listOfAnswers = []
        for (const [index, quest] of question.entries()) {
          if (detection[2] !== undefined) {
            const numberOfCaracteresToDelete = -Number(detection[2])
            if (numberOfCaracteresToDelete < 0)
              listOfAnswers[index] = answer.replace(regex, question[index].slice(0, numberOfCaracteresToDelete))
            else
              listOfAnswers[index] = answer.replace(regex, question[index].slice(numberOfCaracteresToDelete))
          } else {
            listOfAnswers[index] = answer.replace(regex, question[index])
          }
        }
        return listOfAnswers
      }
      return answer
    } else if (_.isArray(answer) && _.isString(question)) {
      for (const [index, ans] of answer.entries()) {
        const detection = ans.match(regex)
        if (detection !== null) {
          if (detection[2] !== undefined) {
            const numberOfCaracteresToDelete = -Number(detection[2])
            if (numberOfCaracteresToDelete < 0)
              answer[index] = ans.replace(regex, question.slice(0, numberOfCaracteresToDelete))
            else
              answer[index] = ans.replace(regex, question.slice(numberOfCaracteresToDelete))
          } else {
            answer[index] = ans.replace(regex, question)
          }
        }
      }
      return answer
    } else if (_.isString(answer) && _.isString(question)) {
      const detection = answer.match(regex)
      if (detection !== null) {
        if (detection[2] !== undefined) {
          const numberOfCaracteresToDelete = -Number(detection[2])
          if (numberOfCaracteresToDelete < 0)
            answer = answer.replace(regex, question.slice(0, numberOfCaracteresToDelete))
          else
            answer = answer.replace(regex, question.slice(numberOfCaracteresToDelete))
        } else {
          answer = answer.replace(regex, question)
        }
      }
      return answer
    }
    return answer
  }

  replaceVars(chaine) {
    const self = this

    function onlyVarw(all, p1, p2) {
      return "self.wVars['" + p1 + "']" + p2
    }
    function onlyVarc(all, p1, p2) {
      return "self.cConsts['" + p1 + "']" + p2
    }

    if (typeof chaine === "string") {
      for (const c in this.wVars) {
        const regex = new RegExp(":("+c+")([^\\w\\d])", 'g')
        chaine = chaine.replace(regex, onlyVarw)
      }
      for (const c in this.cConsts) {
        const regex = new RegExp(":("+c+")([^\\w\\d])", 'g')
        chaine = chaine.replace(regex, onlyVarc)
      }

      let result = ""
      try {
        result = eval("`" + chaine.replace(/\\/g, "\\\\") + "`")
      } catch (error) {
        utils.debug(error, "Error replacing vars with " + chaine)
        console.log(this.wVars, this.cConsts)
      }

      if (!isNaN(result) && result !== '' && result.indexOf('+') < 0) {
        return parseFloat(result)
      } else if (result === 'true' || result === 'false') {
        return result === 'true'
      }
      return result
    } else if (typeof chaine === "object") {
      if (_.isArray(chaine)) {
        for (let i = 0; i < chaine.length; ++i) {
          chaine[i] = this.replaceVars(chaine[i])
        }
      } else {
        for (const i in chaine) {
          chaine[i] = this.replaceVars(chaine[i])
        }
      }
      return chaine
    }
    return chaine
  }

  generate(n = 10, opt, patt, sample) {
    let optionNumber, patternNumber, lenQ = false
    this.wVars = {}
    let loopProtect = 0
    const maxLoop = 100

    this.intVarsHistoric = {}
    this.arraysHistoric = {}

    for (let i = 0; i < n; i++) {
      optionNumber = opt !== undefined ? opt : this.getOption()
      patternNumber = patt !== undefined ? patt : this.getPattern(optionNumber)

      if (optionNumber !== false) {
        if (this.options[optionNumber].vars === undefined) {
          this.cVars = this.vars
        } else if (this.vars !== undefined) {
          this.cVars = Object.assign({}, this.vars, this.options[optionNumber].vars)
        } else {
          this.cVars = this.options[optionNumber].vars
        }

        if (this.options[optionNumber].consts === undefined) {
          this.cConsts = utils.clone(this.consts)
        } else if (this.consts !== undefined) {
          this.cConsts = Object.assign({}, utils.clone(this.consts), utils.clone(this.options[optionNumber].consts))
        } else {
          this.cConsts = utils.clone(this.options[optionNumber].consts)
        }

        if (patternNumber !== false) {
          if (this.options[optionNumber].question !== undefined) {
            this.cQuestion = this.options[optionNumber].question[patternNumber]
            lenQ = this.options[optionNumber].question.length
            if (this.options[optionNumber].audio !== undefined) {
              this.cAudio = this.options[optionNumber].audio[patternNumber] || false
            }
          } else {
            this.cQuestion = this.questionPatterns[patternNumber]
            this.cAudio = this.audioQuestionPatterns[patternNumber] || false
            lenQ = this.questionPatterns.length
          }
        } else if (this.options[optionNumber].question === undefined) {
          this.cQuestion = this.questionPatterns
          this.cAudio = this.audioQuestionPatterns || false
        } else {
          this.cQuestion = this.options[optionNumber].question
          this.cAudio = this.options[optionNumber].audio || false
        }

        if (this.options[optionNumber].answer === undefined) {
          this.cAnswer = this.answerPatterns
        } else {
          this.cAnswer = this.options[optionNumber].answer
        }

        if (this.options[optionNumber].value === undefined) {
          this.cValue = this.valuePatterns ? this.valuePatterns : this.cAnswer
        } else {
          this.cValue = this.options[optionNumber].value
        }

        if (Array.isArray(this.cAnswer) && lenQ) {
          if (this.cAnswer.length === lenQ) {
            this.cAnswer = this.cAnswer[patternNumber]
          } else {
            this.cAnswer = this.cAnswer[math.aleaInt(0, this.cAnswer.length - 1)]
          }
          if (this.cValue.length === lenQ) {
            this.cValue = this.cValue[patternNumber]
          }
        }
      } else {
        this.cVars = this.vars
        this.cConsts = utils.clone(this.consts)
        if (patternNumber !== false) {
          this.cQuestion = this.questionPatterns[patternNumber]
          this.cAudio = this.audioQuestionPatterns[patternNumber] || false
        } else {
          this.cQuestion = this.questionPatterns
          this.cAudio = this.audioQuestionPatterns || false
        }
        if (Array.isArray(this.answerPatterns) && this.answerPatterns.length === this.questionPatterns.length) {
          this.cAnswer = this.answerPatterns[patternNumber]
        } else {
          this.cAnswer = this.answerPatterns
        }
        this.cValue = this.valuePatterns ? this.valuePatterns : this.cAnswer
      }

      // Génération des valeurs des variables
      for (const name in this.cVars) {
        this.wVars[name] = this.cVars[name]
        if (typeof this.wVars[name] === "string" && this.wVars[name].indexOf("${") > -1) {
          this.wVars[name] = this.replaceVars(this.wVars[name])
        }
        if (typeof this.wVars[name] === "object") {
          if (this.arraysHistoric[name] === undefined) {
            this.arraysHistoric[name] = []
            this.arraysHistoric[name + '-length'] = this.wVars[name].length
          }
          let protectionLoop = 0, entier = 0
          do {
            entier = math.aleaInt(0, this.wVars[name].length - 1)
            protectionLoop++
            if (protectionLoop > 100) break
          } while (this.arraysHistoric[name].indexOf(entier) > -1)
          this.arraysHistoric[name].push(entier)
          this.wVars[name] = this.replaceVars(this.wVars[name][entier])
          if (this.arraysHistoric[name].length >= this.arraysHistoric[name + '-length']) {
            this.arraysHistoric[name].splice(0)
          }
        } else if (typeof this.wVars[name] === "string" && this.wVars[name].indexOf("_") > -1) {
          const bornes = this.wVars[name].split("_")
          if (bornes[0].indexOf("d") > -1) {
            // Cas décimal
            this.wVars[name] = math.aleaFloat(Number(bornes[0].substring(1)), Number(bornes[1]), Number(bornes[2]), bornes[3], bornes[4])
          } else {
            // Cas entier
            if (this.intVarsHistoric[name] === undefined) {
              let nbValues = Math.abs(Number(bornes[1]) - Number(bornes[0])) + 1
              const max = Math.max(Number(bornes[0]), Number(bornes[1]))
              const min = Math.min(Number(bornes[0]), Number(bornes[1]))
              let primes = []
              let objContraintes = false
              if (bornes[2]) {
                if (bornes[2].indexOf("^") > -1) objContraintes = bornes[2]
              }
              if (bornes[3]) {
                if (bornes[3].indexOf("^") > -1) objContraintes = bornes[3]
              }
              if (objContraintes) {
                const liste = objContraintes.substring(1).split(",")
                if (liste.indexOf("prime") > -1) {
                  for (let j = 0; j < math.premiers.length; j++) {
                    if (math.premiers[j] <= max && math.premiers[j] >= min) {
                      primes.push(math.premiers[j])
                    } else if (math.premiers[j] > max) break
                  }
                }
                nbValues = nbValues - liste.length - primes.length + (liste.indexOf("prime") > -1 ? 1 : 0) + (liste.indexOf("&") > -1 ? 1 : 0)
              }
              this.intVarsHistoric[name] = []
              this.intVarsHistoric[name + "-length"] = nbValues
            }
            let entier
            let protectionLoop = 0
            do {
              entier = math.aleaInt(Number(bornes[0]), Number(bornes[1]), bornes[2], bornes[3])
              protectionLoop++
              if (protectionLoop > 100) break
            } while (this.intVarsHistoric[name].indexOf(entier) > -1)
            this.intVarsHistoric[name].push(entier)
            if (this.intVarsHistoric[name].length >= this.intVarsHistoric[name + "-length"]) {
              this.intVarsHistoric[name].splice(0)
            }
            this.wVars[name] = entier
          }
        }
      }

      // Variables dans les constantes
      if (this.cConsts !== undefined) {
        this.cConsts = this.replaceVars(this.cConsts)
        this.wVars = this.replaceVars(this.wVars)
      }

      if (!sample) {
        const thequestion = this.replaceVars(utils.clone(this.cQuestion))
        let theaudio = false
        const thevalue = this.replaceVars(utils.clone(this.cValue))

        if (this.cAudio) {
          theaudio = this.replaceVars(utils.clone(this.cAudio))
        }

        loopProtect++

        if (this.questions.indexOf(thequestion) < 0 || this.values.indexOf(thevalue) < 0 || this.repeat) {
          if (typeof this.repeat === "number") {
            const last2Values = this.values.slice(-this.repeat)
            let count = 0
            for (let j = 0; j < last2Values.length; j++) {
              if (last2Values[j] === thevalue) count++
            }
            if (count >= 2) {
              i--
              if (loopProtect < maxLoop) continue
              else break
            }
          } else if (this.repeat) {
            const last5Questions = this.questions.slice(-5)
            const last5values = this.values.slice(-5)
            if (last5Questions.indexOf(thequestion) > -1 && last5values.indexOf(thevalue) > -1) {
              i--
              if (loopProtect < maxLoop) continue
              else break
            }
          }

          this.questions[i] = thequestion
          this.audios[i] = theaudio
          this.answers[i] = this.replaceQuestionInAnswer(this.replaceVars(utils.clone(this.cAnswer)), thequestion)
          this.values[i] = thevalue
        } else {
          i--
          if (loopProtect < maxLoop) continue
          else break
        }
      } else {
        this.sample = {
          question: this.replaceVars(this.cQuestion)
        }
        this.sample.answer = this.replaceQuestionInAnswer(this.replaceVars(this.cAnswer), this.sample.question)
        this.sample.audio = this.replaceQuestionInAnswer(this.replaceVars(this.cAudio), this.sample.question)
      }
    }
  }
}

// ============================================
// EXPORTS
// ============================================

export { Activity, math, MMmath, utils, _ }
