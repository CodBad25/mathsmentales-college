import katex from '../libs/katex/katex.mjs';
export { utils as default }
// Some traductions
const moisFR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const joursFR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export const _ = {
    /**
     * Checks if an object is an array.
     * 
     * @param {Object} o - The object to check.
     * @returns {boolean} Returns true if the object is an array, otherwise false.
     */
    isArray: function (o) {
        return Object.prototype.toString.call(o) === '[object Array]';
    },
/**
 * Checks if an object is empty.
 * 
 * @param {Object} obj - The object to check.
 * @returns {boolean} Returns true if the object has no enumerable properties, otherwise false.
 */
    isEmpty: function (obj) {
        var x;
        for (x in obj) {
            return false;
        }
        return true;
    },
    /**
     * Checks if an object is an object.
     * 
     * @param {Object} o - The object to check.
     * @returns {boolean} Returns true if the object is an object, otherwise false.
     */
    isObject: function (o) {
        return Object.prototype.toString.call(o) === '[object Object]';
    },
    /**
     * Checks if an object is a string.
     * 
     * @param {Object} o - The object to check.
     * @returns {boolean} Returns true if the object is a string, otherwise false.
     */
    isString: function (o) {
        return Object.prototype.toString.call(o) === '[object String]';
    },
    /**
     * Reduces a given object to a single output value.
     * 
     * @param {Object} obj - The object to reduce.
     * @param {Function} iteratee - A function invoked per own property key in object, taking four arguments: (previousValue, currentValue, key, object)
     * @param {*} [memo] - The initial value to return.
     * @param {*} [context] - The this binding of the iteratee.
     * @returns {*} Returns the accumulated value.
     */
    reduce: function(obj, iteratee, memo, context) {
        if (obj == null) obj = [];
        const keys = Object.keys(obj);
        const length = keys.length;
        let index = 0;

        if (arguments.length < 3) {
            memo = obj[keys[index]];
            index += 1;
        }

        for (; index < length; index++) {
            const key = keys[index];
            memo = iteratee.call(context, memo, obj[key], key, obj);
        }

        return memo;
    },
    /**
     * Sorts the elements of a collection in ascending order by the results of
     * running each element in a collection through an iteratee.
     * 
     * @param {Array|Object} collection - The collection to iterate over.
     * @param {Function} iteratee - The iteratee invoked per element.
     * @returns {Array} Returns the new sorted array.
     */
    sortBy: function(collection, iteratee) {
        return Object.entries(collection)
            .map(([key, value]) => ({ key, value, criteria: iteratee(value) }))
            .sort((a, b) => {
                if (a.criteria < b.criteria) return -1;
                if (a.criteria > b.criteria) return 1;
                return 0;
            })
            .map(item => item.value);
    },
    /**
     * The opposite of _.max; this method returns the smallest value in `collection`.
     *
     * If `collection` is empty or falsey, `undefined` is returned.
     *
     * @static
     * @memberOf _
     * @category Math
     * @param {Array} collection The collection to iterate over.
     * @returns {*} Returns the minimum value.
     * @example
     *
     * _.min([4, 2, 8, 6]);
     * // => 2
     */
    min: function(collection) {
        return Math.min(...Object.values(collection));
    },

    /**
     * The opposite of _.min; this method returns the largest value in `collection`.
     *
     * If `collection` is empty or falsey, `undefined` is returned.
     *
     * @static
     * @memberOf _
     * @category Math
     * @param {Array} collection The collection to iterate over.
     * @returns {*} Returns the maximum value.
     * @example
     *
     * _.max([4, 2, 8, 6]);
     * // => 8
     */
    max: function(collection) {
        return Math.max(...Object.values(collection));
    }
}
export const utils = {
    baseURL: window.location.href.split("?")[0].split("#")[0],
    seed: "sample",
    security: 300,// max number for boucles
    modeDebug: true,
    debug: function () {
        if (utils.modeDebug) console.log(arguments);
    },
    getVersion() {
        const fileName = document.getElementById("mmscriptid").attributes.src.value;
        /*get value from query parameters*/
        const regex = /(\d+\.\d+\.\d+)/;
        const match = fileName.match(regex);
        return match ? match[1] : null;
    },
    /**
     * objet contenant des fonctions utiles à MathsMentales
     */
    /**
     * @param {String} type of DOM element
     * @param {object} props properties of the element
     */
    create: function (type, props) {
        const elt = document.createElement(type);
        for (const p in props) {
            elt[p] = props[p];
        }
        return elt;
    },
    // met la première lettre en majuscule
    capitalize: function (str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    copy(DOMel) {
        /*DOMel.select();
        DOMel.setSelectionRange(0,99999);
        document.execCommand("copy");*/
        let text = DOMel.value;
        navigator.clipboard.writeText(text).then(() => {
            DOMel.className = "copied";
            setTimeout(() => { DOMel.className = ""; }, 3000);
        }).catch(err => { console.log("erreur de copie dans le presse papier") });
    },
    pageWidth() {
        return window.innerWidth != null ? window.innerWidth : document.documentElement && document.documentElement.clientWidth ? document.documentElement.clientWidth : document.body != null ? document.body.clientWidth : null;
    },
    /**
     * La transformation d'une ou d'un panier MMv1 étant assez compliquée,
     * redirection vers le dosser comportant l'ancienne version : /old
     */
    goToOldVersion() {
        window.location.href = (utils.baseURL + 'old/').replace("index.htmlold", "old") + (/(^.*\/)(.*)/.exec(window.location.href)[2]);
    },
    /**
     * Performs check on radio button with name and value
     * @param {String} name 
     * @param {String} value 
     * @returns 
     */
    checkRadio(name, value) {
        let domElt = document.querySelector("input[type=radio][name='" + name + "'][value='" + value + "']");
        if (domElt)
            domElt.checked = true;
        else
            return false;
    },
    /**
     * performs check on checkbox inputs from name and values
     * @param {String} name 
     * @param {String, Array} values 
     * @returns 
     */
    checkCheckbox(name, value) {
        // remise à zéro de tous les éléments
        document.querySelectorAll("input[type='checkbox'][name='" + name + "']").forEach(el => {
            el.checked = false;
        })
        if (_.isArray(value)) {
            value.forEach(el => {
                let domElt = document.querySelector("input[type=checkbox][name='" + name + "'][value='" + el + "']");
                if (domElt)
                    domElt.checked = true;
            })
        } else {
            let domElt = document.querySelector("input[type=checkbox][name='" + name + "'][value='" + value + "']");
            if (domElt)
                domElt.checked = true;
        }
    },
    selectOption(id, value) {
        let domElt = document.getElementById(id);
        for (let i = 0; i < domElt.options.length; i++) {
            if (domElt.options[i].value === value) {
                domElt.selectedIndex = i;
                break;
            }
        }
    },
    getTypeOfURL(url, type=false) {
        if(!type){
            if(url.indexOf("cartesflash.html") > -1) return "paramsflashcards";
            else if (url.indexOf("ceinture.html") > -1) return "paramsceinture"
            else if(url.indexOf("courseauxnombres.html") > -1) return "paramscourse";
            else if (url.indexOf("diaporama.html") > -1) return "paramsdiapo"
            else if (url.indexOf("dominos.html") > -1) return "paramsdominos"
            else if (url.indexOf("duel.html") > -1) return "paramsduel"
            else if(url.indexOf("exam.html") > -1) return "paramsinterro";
            else if (url.indexOf("exercices.html") > -1) return "paramsexos"
            else if (url.indexOf("jaiquia.html") > -1) return "paramswhogots"
            else if (url.indexOf("puzzle.html") > -1) return "paramspuzzle"
            else if (url.indexOf("wall.html") > -1) return "paramswall"
            else return "paramsdiapo"
        } else {
            if (type === 'cartesflash') return "paramsflashcards"
            else if (type === 'ceinture') return "paramsceinture"
            else if (type === 'cansheet') return "paramscourse"
            else if (type === 'diaporama') return "paramsdiapo"
            else if (type === 'dominos') return "paramsdominos"
            else if (type === 'duel') return "paramsduel"
            else if (type === 'exam') return "paramsinterro"
            else if (type === 'exosheet') return "paramsexos"
            else if (type === 'whogots') return "paramswhogots"
            else if (type === 'puzzle') return "paramspuzzle"
            else if (type === 'wall') return "paramswall"
            else return "paramsdiapo"
        }
    },
    /**
     * 
     * @param {Array} array tableau contenant des données
     * @param {someThing} value value à rechercher
     * @returns {Number} count nombre des valeurs dans le tableau
     */
    countValue(array, value) {
        let count = 0
        for (let i = 0, j = array.length; i < j; i++) {
            if (array[i] === value) count++
        }
        return count;
    },
    /**
    * convert seconds to hours minutes & seconds
    * @param {Integer} sec number of seconds to convert
    * @returns 
    */
    sToMin(sec) {
        sec = Number(sec);
        let time = "";
        if (sec > 3600) {
            time += ~~(sec / 3600) + " h ";
            sec = sec % 3600;
        }
        if (sec > 60) {
            time += ~~(sec / 60) + " min ";
            sec = sec % 60;
        }
        return time += sec;
    },
    /**
     * Endode les accolades dans une chaine car encodeURIComponent ne le fait pas
     * @param {String} url a string corresponding an URL
     * @returns better encoded string
     */
    superEncodeURI: function (url) {
        var encodedStr = '', encodeChars = ["(", ")", "{", "}", ",", "-"];
        url = encodeURIComponent(url);
        for (var i = 0, len = url.length; i < len; i++) {
            if (encodeChars.indexOf(url[i]) >= 0) {
                var hex = parseInt(url.charCodeAt(i)).toString(16);
                encodedStr += '%' + hex;
            }
            else {
                encodedStr += url[i];
            }
        }
        return encodedStr;
    },
    /**
     * get data form url
     * @returns array of datas from GET vars
     */
    getUrlVars: function (urlString) {
        if (!urlString) urlString = window.location;
        else urlString = new URL(urlString);
        var vars = {},
            hash;
        if (urlString.hash !== '' && urlString.search === '') { // cas d'une activité MMv1
            // cas d'une référence simple à l'exo
            // pour ouvrir l'éditeur sur cet exo
            let idExo = urlString.hash.slice(1);
            if (MM1toMM2[idExo].new !== undefined) {
                vars.u = MM1toMM2[idExo].new;
            }
        }
        // on fait un tableau de données qui sont séparées par le &
        let trueUrl = urlString.search.slice(1);
        trueUrl = trueUrl.replace('&amp;', '&');
        let hashes = trueUrl.split('&');
        if (this.isURLEncoded(trueUrl)) {
            trueUrl = this.decodeUrlUnreadable(hashes[0]);
            trueUrl = trueUrl.replace('&amp;', '&');
            let datas = trueUrl.split('&');
            if (hashes[1] !== undefined)
                hashes = [...datas, ...hashes.slice(1)];
            else
                hashes = [...datas];
        }
        var len = hashes.length;
        // cas de la version avant le 15/08/21 - simple
        // le tilde ~ est une caractéristique des nouvelles url
        if (trueUrl.indexOf("~") < 0) {
            for (var i = 0; i < len; i++) {
                hash = hashes[i].split('=');
                vars[hash[0]] = hash[1];
            }
            // version après le 15/08/21
            // reconstruction de la chaine pour en faire un objet
            // la chaine est de la forme
            /* url?i=intro,e=end,o=online,s=nbsliders,so=orientation,f=facetotface,a=seed,colors=color0~color1~color2~color3
                 &p=cartId1~t=title1~c=target1~o=ordered
                _i=activityId1~o=optionsIds~q=subOptionsIds~p=???~t=durée~n=nbquestions
                _i=activityId2~o=optionsIds~q=subOptionsIds~p=???~t=durée~n=nbquestions
                &p=cartId2~t=title2~c=target2~o=ordered
                _i=activityId1~o=optionsIds~q=subOptionsIds~p=???~t=durée~n=nbquestions
                _i=activityId2~o=optionsIds~q=subOptionsIds~p=???~t=durée~n=nbquestions
    
                le 22/10/24 ajout du paramètre &edit qui permet d'effectuer un paramétrage
              optionsIds et subOptionsIds peuvent être une liste d'id séparés par des virgules ou rien
            */
        } else {
            // données générales :
            // la virgule est le séparateur de données avec affectation
            // ces données sont les premières du tableau hashes
            hash = hashes[0].split(",");
            for (let i = 0; i < hash.length; i++) {
                // le signe égal est le séparateur variable/valeur
                let data = hash[i].split("=");
                vars[data[0]] = data[1] ? data[1] : false;
            }
            // vars.c doit contenir les carts. Dans la version après 15/08/21, vars.c est une chaine
            // on reconstruit l'objet json à partir de la chaine
            vars.c = {};
            for (let i = 1; i < len; i++) {
                // on ne commence qu'à 1, le zéro ayant déjà été traité ci-dessus
                // si la première lettre est p, on a un panier
                if (hashes[i].indexOf("p") === 0) {
                    // le séparateur d'activités est le _
                    let parts = hashes[i].split("_");
                    // parts[0] contient les données du panier, que l'on stocke dans data
                    // le séparateur de couples var/valeur est ~
                    let data = parts[0].split("~");
                    let datas = {};
                    for (let j = 0; j < data.length; j++) {
                        // le séparateur var/valeur est =
                        let dataparts = data[j].split("=");
                        datas[dataparts[0]] = decodeURI(dataparts[1]);
                    }
                    let id = datas.p;
                    vars.c[id] = { i: datas.p, t: datas.t, c: datas.c, o: datas.o, a: {}, d: datas.d, at: datas.at };
                    // parts[>0] : parameters cart's activities
                    for (let j = 1; j < parts.length; j++) {
                        let datasActivity = parts[j].split("~");
                        vars.c[id].a[j - 1] = {};
                        for (let k = 0; k < datasActivity.length; k++) {
                            let dataparts = datasActivity[k].split("=");
                            if (dataparts[0] === "o") {
                                vars.c[id].a[j - 1][dataparts[0]] = utils.textToTable(dataparts[1]);
                            } else if (dataparts[0] === "q") {
                                vars.c[id].a[j - 1][dataparts[0]] = utils.textToObj(dataparts[1]);
                            } else {
                                vars.c[id].a[j - 1][dataparts[0]] = dataparts[1];
                            }
                        }
                    }
                } else if (hashes[i].indexOf("embed") === 0) {
                    let parts = hashes[i].split("=");
                    vars.embed = parts[1];
                } else if (hashes[i].indexOf("edit") === 0) {
                    vars.edit = true
                } else if (hashes[i].indexOf("logo") === 0) {
                    vars.logo = true
                } else if (hashes[i].indexOf("type") === 0) {
                    vars.type = hashes[i].split("=")[1];
                }
            }
        }
        return vars;
    },
    /**
     * Donne la date du moment
     * @returns date en français avec jour, heure etc
     */
    getDate() {
        let ladate = new Date(),
            lheure = ladate.getHours(),
            lesminutes = ladate.getMinutes(),
            lessecondes = ladate.getSeconds(),
            ladateComplete = joursFR[ladate.getDay()] + " " + ladate.getDate() + " " + moisFR[ladate.getMonth()] + " " + ladate.getFullYear() + " - " + ((lheure < 10) ? "0" + lheure : lheure) + ":" + ((lesminutes < 10) ? "0" + lesminutes : lesminutes) + ":" + ((lessecondes < 10) ? "0" + lessecondes : lessecondes);
        return ladateComplete;
    },
    /**
     * Transform 10:05 string to seconds string, return number
     * @param {string} timeValue 
     */
    timeToSeconds(timeValue) {
        let elems = timeValue.split(":");
        return Number(elems[0]) * 60 + Number(elems[1]);
    },
    /**
     * Transform seconds string to 10:05 string
     * @param {number} seconds 
     */
    secondToTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        seconds = seconds % 60;
        return (minutes < 10 ? "0" + String(minutes) : String(minutes)) + ":" + (seconds < 10 ? "0" + String(seconds) : String(seconds));
    },
    /**
     * Create a string of six alphabetic letters
     * @returns (String) a aleatorycode
     */
    seedGenerator: function () {
        let str = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let code = "";
        for (let i = 0; i < 6; i++) {
            // n'utilise pas l'outil de randomisation dirigée par le seed
            code += str[Math.floor(Math.random() * (str.length))];
        }
        return code;
    },
    setSeed(value) {
        let returnValue = ''
        if (value !== undefined && value !== "sample") {
            returnValue = value
        } else {
            returnValue = this.seedGenerator();
        }
        this.initializeAlea(returnValue);
        return returnValue
    },
    /**
     * 
     * @params {string} seed valeur d'initialisation des données aléatoires
     * return nothing
     */
    initializeAlea: function (seed) {
        if (seed !== undefined) {
            if (utils.alea) delete utils.alea;
            utils.alea = new Math.seedrandom(seed);
        } else {
            if (utils.alea) delete utils.alea;
            utils.alea = new Math.seedrandom(diaporama.seed);
        }
    },

    /**
    * function addClass
    * Add a class to a DOM element
    * 
    * @params elt (DOMelt)
    * @params newClass (String) : string of coma separated classnames
    */
    addClass: function (elt, newClass) {
        var n = 0;
        newClass = newClass.split(",");
        for (let i = 0; i < newClass.length; i++) {
            if ((" " + elt.className + " ").indexOf(" " + newClass[i] + " ") == -1) {
                elt.className += " " + newClass[i];
                n++;
            }
        }
        return n;
    },
    /**
     * get the DOM button originaly targeted by a click, specialy done when an image is clicked inside a button.
     * @param {evt} evt click event object
     * @returns 
     */
    getTargetWithImageInside(evt) {
        let target = evt.target;
        if (evt.target.nodeName.toLowerCase() === "i") {
            target = evt.target.parentNode;
        }
        return target;
    },
    createCeintureTitres(qty) {
        if (qty < 1 || qty > 5) return false;
        const dest = document.getElementById("ceintcolumnTitle");
        const champs = dest.querySelectorAll("input");
        const labels = dest.querySelectorAll("label");
        const br = dest.querySelectorAll("br");
        // création de champ :
        if (champs.length < qty) {
            dest.appendChild(utils.create("br"));
            dest.appendChild(utils.create("label", { for: "ceinttitlecol" + qty, innerHTML: "Colonne " + qty + " : " }));
            dest.appendChild(utils.create("input", { type: "text", id: "ceinttitlecol" + qty, placeholder: "Texte, ou rien" }));
        } else if (champs.length > qty) {
            // suppression du dernier champ
            dest.removeChild(labels[champs.length - 1]);
            dest.removeChild(champs[champs.length - 1]);
            dest.removeChild(br[champs.length - 1]);
        }
    },
    /**
     * Récupère la valeur cochée d'un groupe d'input radio
     * @param {String} name nom DOM du groupe d'input radio
     * @returns valeur du radio coché
     */
    getRadioChecked: function (name) {
        let radio = document.getElementsByName(name);
        let returnValues = []
        for (let i = 0, length = radio.length; i < length; i++) {
            if (radio[i].checked) {
                returnValues.push(radio[i].value);
            }
        }
        if (returnValues.length > 1) return returnValues.join("-");
        else if (returnValues.length === 1) return returnValues[0];
        else return false;
    },
    /**
     * 
     * @param {string} value id select
     * @returns string
     */
    getSelectValue: function (id) {
        try {
            let select = document.getElementById(id);
            return select[select.selectedIndex].value;
        } catch (err) {
            console.log(err)
        }
    },
    /**
     * renvoit un nombre si le nombre est sous forme de chaine
     * @param {String} value number
     * @returns Number typed number or string
     */
    numberIfNumber: function (value) {
        if (String(Number(value)) === value) {
            return Number(value);
        } else {
            return value;
        }
    },
    // isEmpty, teste si un objet est vide ou pas
    // @param (Object) obj : objet ou tableau à analyser
    // return true pour vide
    // return false sinon
    isEmpty: function (obj) {
        var x;
        for (x in obj) {
            return false;
        }
        return true;
    },
    /**
     * shuffle an array
     * @param {Array} arr 
     */
    shuffle: function (arr) {
        if (!Array.isArray(arr)) return false;
        let curId = arr.length;
        while (0 !== curId) {
            let randId = Math.floor(utils.alea() * curId);
            curId -= 1;
            let tmp = arr[curId];
            arr[curId] = arr[randId];
            arr[randId] = tmp;
        }
        return arr;
    },
    /**
     * plie ou déplie la liste des exercices
     * @param {elt} elt DOM elt
     */
    deploy(elt) {
        let destClass = "hideup";
        let eltClass = "pointer plus";
        if (elt.nodeName === "H3") {
            let dest = elt.nextSibling;
            if (elt.className === eltClass) {
                eltClass = "pointer moins";
                destClass = "showdown";
            }
            elt.className = eltClass;
            dest.className = destClass;
        } else if (elt.nodeName === "H2") {
            if (elt.className === "pointer plus") {
                eltClass = "pointer moins"
                destClass = "showdown";
            }
            elt.className = eltClass;
            while (elt.nextSibling !== null) {
                elt = elt.nextSibling;
                if (elt.nodeName === "H2") break;
                if (elt.nodeName === "UL")
                    elt.className = destClass;
                else if (elt.nodeName === "H3")
                    elt.className = eltClass;
            }
        } else if (elt.nodeName === "H1") {
            if (elt.className === "pointer plus") {
                eltClass = "pointer moins";
                destClass = "showdown";
            }
            elt.className = eltClass;
            const h2 = document.querySelectorAll("#resultat-chercher h2");
            const h3 = document.querySelectorAll("#resultat-chercher h3");
            const ul = document.querySelectorAll("#resultat-chercher ul");
            h2.forEach((el) => el.className = eltClass);
            h3.forEach((el) => el.className = eltClass);
            ul.forEach((el) => el.className = destClass);
        }
    },
    /**
     * fonctions utilisées pour l'import/export des activités.
     * @param {Array} array 
     * @returns 
     */
    tableToText(array) {
        if (array === undefined) return "";
        if (typeof array === "string") return array;
        return array.join(",");
    },
    textToTable(string) {
        if (string === undefined || string === "") return [];
        else
            return string.split(",").map(Number);
    },
    objToText(obj) {
        if (obj === undefined) return "";
        let string = "";
        let start = true;
        for (const i in obj) {
            if (start) {
                string += i + "." + utils.tableToText(obj[i]);
                start = false;
            } else {
                string += "-" + i + "." + utils.tableToText(obj[i]);
            }
        }
        return string;
    },
    textToObj(string) {
        let obj = {};
        let elts = string.split("-");
        for (let i = 0; i < elts.length; i++) {
            let subelts = elts[i].split(".");
            obj[subelts[0]] = utils.textToTable(subelts[1]);
        }
        return obj;
    },
    /**
     * 
     * @param {string} chaine chaine à tester
     * @returns boolean
     */
    testIfLatex(chaine){
        let isLatex = false;
        isLatex = chaine.indexOf('\\')>-1 || chaine.indexOf('x')>-1 || chaine.indexOf('^')>-1;
        return isLatex;
    },
    /**
    * function removeClass
    * remove a class name from a DOM element
    *
    * @param elt : DOM element
    * @param className (String) : name of classname
    */
    removeClass: function (elt, className) {
        elt.classList.remove(className);
        /*if((" "+elt.className+" ").indexOf(" "+className+" ")>-1){
            var classes = elt.className.split(" "), newclasses="";
            for(let i=0;i<classes.length;i++){
                if(classes[i] !== className)newclasses+=" "+classes[i];
            }
            elt.className = newclasses.trim();
        }*/
    },
    /**
     * checkSecurity to avoid infinite loop
     * 
     */
    checkSecurity() {
        utils.security--;
        if (utils.security < 0) {
            console.log("infinite loop")
            return false;
        }
        else return true;
    },
    toDecimalFr: function (value) {
        let parties = value.split(".");
        let partieEntiere = parties[0];
        let partieDecimale = "";
        if (parties.length > 1) partieDecimale = parties[1];
        if (partieEntiere.length > 3) {
            let s = partieEntiere.length % 3;
            partieEntiere = partieEntiere.substring(0, s) + "~" + partieEntiere.substring(s).match(/\d{3}/g).join("~");
        }
        if (partieDecimale.length > 3) {
            let nbgp = ~~(partieDecimale.length / 3);
            partieDecimale = partieDecimale.match(/\d{3}/g).join("~") + "~" + partieDecimale.substring(nbgp * 3);
        }
        if (partieDecimale.length) {
            partieDecimale = "{,}" + partieDecimale;
        }
        //debug(partieEntiere+partieDecimale);
        return partieEntiere + partieDecimale;
    },
    /**
     * Render the math
     * @param (dom) wtarget : window reference
     */
    mathRender: function (wtarget = false, diaporama = false) {
        let contents = ["enonce-content", "corrige-content", "sampleLayer"];
        if (!diaporama) {
            contents = ["enonce-content", "corrige-content", "activityOptions", "activityDescription", "activityConsigne"];
        }
        if(Array.isArray(wtarget))contents = wtarget;
        contents.forEach(id => {
            // search for $$ formulas $$ => span / span
            let content = document.getElementById(id);
            if (content !== null) {
                content.innerHTML = content.innerHTML.replace(/\$\$([^$]*)\$\$/gi, '<span class="math">$1</span>');
            } else {
                contents = document.querySelectorAll(id);
                contents.forEach(elt => {
                    elt.innerHTML = elt.innerHTML.replace(/\$\$([^$]*)\$\$/gi, '<span class="math">$1</span>');
                });
            }
                
        });
        document.querySelectorAll(".slide").forEach(elt => {
            elt.innerHTML = elt.innerHTML.replace(/\$\$([^$]*)\$\$/gi, '<span class="math">$1</span>');
        });
        document.querySelectorAll(".math").forEach(function (item) {
            // transform ascii to Latex
            //var texTxt = MM.ascii2tex.parse(item.innerHTML);
            var texTxt = item.innerHTML.replace(/\&amp\;/g, "&");
            // suppression du displaystyle
            texTxt = texTxt.replace(/\\displaystyle/g, "");
            // remplacement de &gt; et &lt;
            texTxt = texTxt.replace(/&gt;/g, "\\gt").replace(/&lt;/g, "\\lt");
            // recherche les nombres, décimaux ou pas
            let nbrgx = /(\d+\.*\d*)/g;
            // insère des espaces tous les 3 chiffres;
            texTxt = texTxt.replace(nbrgx, utils.toDecimalFr);
            //texTxt = texTxt.replace(/\.(\d{3})(?=(\d+))/g,"$1~");
            //texTxt = texTxt.replace(/\./g, "{,}");
            try {
                katex.render(texTxt, item, { //"\\displaystyle "+
                    throwOnError: false,
                    errorColor: "#FFF",
                    colorIsTextColor: true
                });
                utils.removeClass(item, "math");
            } catch (err) {
                item.innerHTML = "<span class='err'>" + err + ' avec ' + texTxt + '</span>';
            };
        });
    },
    /**
     * 
     * @param {object} someThing json object or array
     * @returns a clone of the object
     */
    clone(someThing) {
        if (someThing === undefined) return false;
        else if (typeof someThing === "object") {
            return JSON.parse(JSON.stringify(someThing));
        } else {
            return someThing;
        }
    },

    /**
     * 
     * @param {Number} value 
     * @param {Number} digits
     * 
     * return {string} number with a fix digits
     */
    toDigits(value, digits) {
        let puissance = Number(1 + "e" + digits) - 1;
        while (String(value).length < String(puissance).length) {
            value = "0" + value;
        }
        return value;
    },
    /**
     * 
     * @param {String} str 
     * @returns {String} string url encoded non human readable
     */
    encodeUrlUnreadable(str) {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
            (match, p1) => String.fromCharCode(`0x${p1}`)));
    },
    /**
     * 
     * @param {String} str 
     * @returns {String} string url decoded non human readable
     */
    decodeUrlUnreadable(str) {
        return decodeURIComponent(atob(str).split("").map(function(c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(""));
    },
    isURLEncoded(str) {
        return !(str.indexOf("u=") > -1 || str.indexOf("&p=") > 0 || str.indexOf("&amp;p=") > 0 || str.indexOf("&c=") > 0);
    }
}