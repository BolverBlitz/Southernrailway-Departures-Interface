const request = require("request");
const os = require('os');

// https://ldb.fabdigital.uk/#/ldb/SN/OXT/to/null/departure

class Southernrail {
    /**
     * Initialize class
     * @param {string} [api_url] Widget Link that will pe asked
     * @param {boolean} [autoRefresh] If the stop list should be refreshed if a stop isn´t found
     */
    constructor(api_url, autoRefresh = false) {
        this.api_url = api_url || "https://ldb.fabdigital.uk/";
        this.autoRefresh = autoRefresh;

        this.stopList_Long = {};
        this.stopList_Short = {};
        this.stopList_Array = [];

        this.PHPSESSID = "";

        this.debug = false;
        this.refreshNext = false;
        this.appName = "Southernrail_Interface";
        this.appVersion = "0.0.1";
    };

    #customHeaderRequest = request.defaults({
        headers: { 'User-Agent': `${this.appName}/${this.appVersion} (NodeJS_${process.version}) ${os.platform()} (${os.arch()}) NodeJS Wrapper` }
    })

    /**
     * An internal function that checks if the stop lists are populated
     * @returns {Boolean}
     */
    #checkLists = () => {
        if (Object.keys(this.stopList_Long).length === 0) { return true; }
        if (Object.keys(this.stopList_Short).length === 0) { return true; }
        if (this.stopList_Array.length === 0) { return true; }
        if (this.refreshNext) { return true; }
        return false;
    }

    /**
     * An internal function that generates a random CrsKey to be used in the requests
     * @param {Number} numDigits 
     * @returns 
     */
    #generateCrsKey(numDigits) {
        let CrsKey = "";
        let firstDigit = Math.floor(Math.random() * 9) + 1;
        CrsKey += firstDigit;
        for (let i = 1; i < numDigits; i++) {
            CrsKey += Math.floor(Math.random() * 10); 
        }
        return CrsKey;
    }

    /**
     * An internal function to populate all the internal objects and arrays that contain the stop data
     * @returns {Promise}
     */
    #populateStopList = () => {
        return new Promise((resolve, reject) => {
            this.#getStopsList().then((data) => {
                const dataJson = JSON.parse(data);
                for (const [key, value] of Object.entries(dataJson.response)) {
                    this.stopList_Short[key] = {
                        "crsKey": value.crsKey,
                        "commonName": value.commonName,
                    };

                    this.stopList_Long[value.commonName] = {
                        "crsKey": value.crsKey,
                        "shortName": key,
                    };

                    if (this.stopList_Array.includes(value.commonName) === false) {
                        this.stopList_Array.push(value.commonName);
                    }

                }
                resolve();
            }).catch((err) => {
                reject(err);
            });
        });
    }

    #getcrsKey = (stopName) => {
        if (this.stopList_Long[stopName]) {
            return this.stopList_Long[stopName].crsKey;
        }

        if (this.stopList_Short[stopName]) {
            return this.stopList_Short[stopName].crsKey;
        }

        return "Not Found";
    }

    #getPHPSESSID = (CrsKey) => {
        return new Promise((resolve, reject) => {
            if (!CrsKey) CrsKey = this.#generateCrsKey(24);
            if (this.debug) console.log(`getPHPSESSID | Making POST request with CrsKey: ${CrsKey}`);
            this.#customHeaderRequest({
                headers: {
                    'User-Agent': `${this.appName}/${this.appVersion} (NodeJS_${process.env.NODE_VERSION}) ${os.platform()} (${os.arch()}) NodeJS Wrapper`,
                    'Content-Type': `multipart/form-data; boundary=---------------------------${CrsKey}`,
                    'Host': `ldb.fabdigital.uk`,
                    'Origin': `https://ldb.fabdigital.uk`,
                    'Pragma': `no-cache`,
                    'Referer': `https://ldb.fabdigital.uk/`,
                    'Sec-Fetch-Dest': `empty`,
                    'Sec-Fetch-Mode': `cors`,
                    'Sec-Fetch-Site': `same-origin`

                },
                uri: `${this.api_url}/api/index.php?page=env`,
                method: "POST",
                body: `
                -----------------------------${CrsKey}
                Content-Disposition: form-data; name="page"

                env
                -----------------------------${CrsKey}--
                `,
            }, (err, res, body) => {
                if (err) reject(err);
                if (res.statusCode !== 200) reject(res.statusCode);
                if (this.debug) console.log(`getPHPSESSID | PHPSESSID: ${res.headers['set-cookie'][0].split(";")[0].split("=")[1]}`);
                if (this.debug) console.log(`getPHPSESSID | Got status code: ${res.statusCode}`);
                this.PHPSESSID = res.headers['set-cookie'][0].split(";")[0].split("=")[1];
                resolve();
            });
        });
    }

    /**
     * An internal function to load all the stops from the API
     * @returns {Stoplist} 
     */
    #getStopsList = () => {
        return new Promise(async (resolve, reject) => {
            if (this.PHPSESSID === "") {
                if (this.debug) console.log("getShortName | Lists are not populated");
                await this.#getPHPSESSID(); // Wait for our HPHPSESSID to be set
            }
            const CrsKey = this.#generateCrsKey(24);
            if (this.debug) console.log(`getStopsList | Making POST request with CrsKey: ${CrsKey}`);

            const that = this;

            const split_line = `-----------------------------${CrsKey}`;
            const end_line = `-----------------------------${CrsKey}--`;
            // generate the body of the request
            let body_message = [];
            /*
                https://ldb.fabdigital.uk/api/index.php?page=get_station_ref_data
                -----------------------------129867355013474646961699968000
                Content-Disposition: form-data; name="page"

                get_station_ref_data
                -----------------------------129867355013474646961699968000
                Content-Disposition: form-data; name="showProgress"

                false
                -----------------------------129867355013474646961699968000--
            */
            body_message.push(split_line);
            body_message.push(`Content-Disposition: form-data; name="page"`);
            body_message.push(``);
            body_message.push(`get_station_ref_data`);
            body_message.push(split_line);
            body_message.push(`Content-Disposition: form-data; name="showProgress"`);
            body_message.push(``);
            body_message.push(`false`);
            body_message.push(end_line);

            this.#customHeaderRequest({
                headers: {
                    'User-Agent': `${this.appName}/${this.appVersion} (NodeJS_${process.env.NODE_VERSION}) ${os.platform()} (${os.arch()}) NodeJS Wrapper`,
                    'Content-Type': `multipart/form-data; boundary=---------------------------${CrsKey}`,
                    'Cookie': `PHPSESSID=${this.PHPSESSID}`,
                    'Host': `ldb.fabdigital.uk`,
                    'Origin': `https://ldb.fabdigital.uk`,
                    'Pragma': `no-cache`,
                    'Referer': `https://ldb.fabdigital.uk/`,
                    'Sec-Fetch-Dest': `empty`,
                    'Sec-Fetch-Mode': `cors`,
                    'Sec-Fetch-Site': `same-origin`

                },
                uri: `${this.api_url}api/index.php?page=get_station_ref_data`,
                body: body_message.join("\n"),
                method: 'POST'
            }, function (err, res, body) {
                if (err) { reject(err); }
                if (that.debug) console.log(`getStopsList | Got status code: ${res.statusCode}`);
                resolve(body);
            });
        });
    }

    /**
     * Sets the debug mode
     * @param {Boolean} debug
     * @returns {void}
     */
    setDebug = (debug = false) => {
        this.debug = debug;
    }

    /**
     * Sets the application name and version, used in the user-agent header
     * @param {String} appName 
     * @param {String} appVersion 
     */
    setApplication = (appName, appVersion) => {
        this.appName = appName;
        this.appVersion = appVersion;
    }

    /**
     * Refreshes the in-class stop list cache
     * @returns {Promise}
     */
    refreshStopsList = () => {
        return new Promise(async (resolve, reject) => {
            await this.#populateStopList(); // Wait for the list to be populated, then continue
            resolve();
        });
    }

    /**
     * Returns the short stop name from the long name
     * @param {String} LongName 
     * @returns {String} ShortName
     */
    getShortName = (LongName) => {
        return new Promise(async (resolve, reject) => {
            if (this.#checkLists()) {
                if (this.debug) console.log("getShortName | Lists are not populated");
                await this.#populateStopList(); // Wait for the list to be populated, then continue
            }

            if (this.stopList_Long[LongName] === undefined) {
                if (this.debug && this.autoRefresh) console.log("getShortName | Refereshing lists on next reuqest");
                if (this.autoRefresh) { this.refreshNext = true; }
                reject(`Stop "${LongName}" not found`);
            } else {
                resolve(this.stopList_Long[LongName].shortName);
            }
        });
    }

    /**
     * Returns the full stop name from the short name
     * @param {String} ShortName 
     * @returns {String} LongName
     */
    getLongName = (ShortName) => {
        return new Promise(async (resolve, reject) => {
            if (this.#checkLists()) {
                if (this.debug) console.log("getLongName | Lists are not populated");
                await this.#populateStopList(); // Wait for the list to be populated, then continue
            }

            if (this.stopList_Short[ShortName] === undefined) {
                if (this.debug && this.autoRefresh) console.log("getLongName | Refereshing lists on next reuqest");
                if (this.autoRefresh) { this.refreshNext = true; }
                reject(`Stop "${ShortName}" not found`);
            } else {
                resolve(this.stopList_Short[ShortName].commonName);
            }
        });
    }

    /**
     * Quickly search for a stop and return the full stop name (case insensitive) and uses in-class caching
     * @param {String} Stop Full name of the stop
     * @param {Number} OutPutLength Amount of output results
     * @param {Boolean} MatchesOnly Optional, default false. If true it will also return results that only partially match the input string
     * @returns 
     */
    searchStops = (Stop, OutPutLength, MatchesOnly = false) => {
        return new Promise(async (resolve, reject) => {
            if (this.#checkLists()) {
                if (this.debug) console.log("searchStops | Lists are not populated");
                await this.#populateStopList(); // Wait for the list to be populated, then continue
            }
            let s = [];
            let o = [];
            this.stopList_Array.map(ArrayPart => {
                let t = 0; // Counts matches
                let st = 0; // Index pointer for input string
                let hasmatched = MatchesOnly; // OVERRIDE: Only push result if a part or entire string matches
                for (let i = 0; i < ArrayPart.length; i++) {
                    if (ArrayPart[i].toLowerCase() === Stop[st].toLowerCase()) {
                        if (ArrayPart.includes(Stop)) {
                            hasmatched = true;
                            t++;
                            if (st < Stop.length - 1) {
                                st++
                            }
                        }
                    }
                }
                let p = t / ArrayPart.length // p is the match%
                let temp = {
                    a: ArrayPart,
                    p: p
                }
                if (hasmatched) s.push(temp) // Only push fully matched, if enabled.
            });
            s.sort((a, b) => (a.p > b.p) ? -1 : 1); // Sort by p
            s.map(SP => {
                o.push(SP.a)
            });
            if (o.length === 0) {
                if (this.debug && this.autoRefresh) console.log("searchStops | Refereshing lists on next reuqest");
                if (this.autoRefresh) { this.refreshNext = true; }
            }
            resolve(o.slice(0, OutPutLength))
        });
    }

    /**
     * Get the departures from a stop, you can provide a destination on the same line if you like.
     * @param {String} from Accepts a short or long name
     * @param {String} [to] (Optional) Accepts a short or long name
     * @returns {Promise}
     */
    getDepartures = (from, to) => {
        return new Promise(async (resolve, reject) => {
            // Check if the lists are populated
            if (this.#checkLists()) {
                if (this.debug) console.log("getDepartures | Lists are not populated");
                await this.#populateStopList(); // Wait for the list to be populated, then continue
            }
            const CrsKey = this.#generateCrsKey(24);
            if (this.debug) console.log(`getDepartures | Making POST request with CrsKey: ${CrsKey}`);

            if(this.#getcrsKey(from) === "Not Found") reject(`Stop "${from}" not found`);

            const tocrsKey = this.#getcrsKey(to);

            const split_line = `-----------------------------${CrsKey}`;
            const end_line = `-----------------------------${CrsKey}--`;
            // generate the body of the request
            let body_message = [];
            /*
                https://ldb.fabdigital.uk/api/index.php?page=ldbws
                -----------------------------68035893835696242651906085675
                Content-Disposition: form-data; name="page"

                ldbws
                -----------------------------68035893835696242651906085675
                Content-Disposition: form-data; name="type"

                DEPARTURE
                -----------------------------68035893835696242651906085675
                Content-Disposition: form-data; name="primaryCrsKey"

                NmMwMTM0MGFhMjI5ZjIxMzk4NWZmOWM2MDI1MDNlOTVxRU05RDExKzA5VFJmL2JuODNvTHhnPT0=
                -----------------------------68035893835696242651906085675
                Content-Disposition: form-data; name="direction"

                to
                -----------------------------68035893835696242651906085675
                Content-Disposition: form-data; name="optionalCrsKey"

                ZmIyNGFmZTQ0MDAyZjY2ODBmZDBlMDgxZWQ4ZGQyNGJhU0cxeFV1ejk4MXJXb3VLcVJMVXlnPT0=
                -----------------------------68035893835696242651906085675
                Content-Disposition: form-data; name="showProgress"

                false
                -----------------------------68035893835696242651906085675--
            */
            body_message.push(`${split_line}`);

            body_message.push(`Content-Disposition: form-data; name="page"`)
            body_message.push(``);
            body_message.push(`ldbws`);
            body_message.push(`${split_line}`);

            body_message.push(`Content-Disposition: form-data; name="type"`);
            body_message.push(``);
            body_message.push(`DEPARTURE`);
            body_message.push(`${split_line}`);

            body_message.push(`Content-Disposition: form-data; name="primaryCrsKey"`);
            body_message.push(``);
            body_message.push(`${this.#getcrsKey(from)}`);

            if (to !== undefined) {
                if(this.#getcrsKey(to) === "Not Found") reject(`Stop "${to}" not found`); 

                body_message.push(`${split_line}`);
                body_message.push(`Content-Disposition: form-data; name="direction"`);
                body_message.push(``);
                body_message.push(`to`);

                body_message.push(`${split_line}`);
                body_message.push(`Content-Disposition: form-data; name="optionalCrsKey"`);
                body_message.push(``);
                body_message.push(`${tocrsKey}`);
            }

            body_message.push(`${split_line}`);
            body_message.push(`Content-Disposition: form-data; name="showProgress"`);
            body_message.push(``);
            body_message.push(`false`);

            body_message.push(`${end_line}`);

            this.#customHeaderRequest({
                headers: {
                    'User-Agent': `${this.appName}/${this.appVersion} (NodeJS_${process.env.NODE_VERSION}) ${os.platform()} (${os.arch()}) NodeJS Wrapper`,
                    'Content-Type': `multipart/form-data; boundary=---------------------------${CrsKey}`,
                    'Cookie': `PHPSESSID=${this.PHPSESSID}`,
                    'Host': `ldb.fabdigital.uk`,
                    'Origin': `https://ldb.fabdigital.uk`,
                    'Cache-Control': `no-cache`,
                    'Pragma': `no-cache`,
                    'Referer': `https://ldb.fabdigital.uk/`,
                    'Sec-Fetch-Dest': `empty`,
                    'Sec-Fetch-Mode': `cors`,
                    'Sec-Fetch-Site': `same-origin`,
                },
                uri: `${this.api_url}api/index.php?page=ldbws`,
                body: body_message.join('\n'),
                method: 'POST'
            }, function (err, res, body) {
                if (err) { reject(err); }
                resolve(JSON.parse(body));
            });
        });
    }

    getRideDetails = (rid) => {
        return new Promise(async (resolve, reject) => {
            // Check if the lists are populated
            if(!rid) reject("No rid provided");
            if (this.#checkLists()) {
                if (this.debug) console.log("getDepartures | Lists are not populated");
                await this.#populateStopList(); // Wait for the list to be populated, then continue
            }
            const CrsKey = this.#generateCrsKey(24);
            if (this.debug) console.log(`getDepartures | Making POST request with CrsKey: ${CrsKey}`);

            const split_line = `-----------------------------${CrsKey}`;
            const end_line = `-----------------------------${CrsKey}--`;
            // generate the body of the request
            let body_message = [];
            /*
            -----------------------------8370107505684882596408869
            Content-Disposition: form-data; name="page"

            ldbws
            -----------------------------8370107505684882596408869
            Content-Disposition: form-data; name="type"

            service
            -----------------------------8370107505684882596408869
            Content-Disposition: form-data; name="rid"

            ZDVmNTAwYjQ1ZmUzZDRjYjRlYjU1ZjQ4NWVmMjZmOTk3YWpCQnU3SUpVeHIyL2JZdlNCZEhnPT0=
            -----------------------------8370107505684882596408869
            Content-Disposition: form-data; name="showProgress"

            false
            -----------------------------8370107505684882596408869--
            */
            body_message.push(`${split_line}`);

            body_message.push(`Content-Disposition: form-data; name="page"`)
            body_message.push(``);
            body_message.push(`ldbws`);
            body_message.push(`${split_line}`);

            body_message.push(`Content-Disposition: form-data; name="type"`);
            body_message.push(``);
            body_message.push(`service`);
            body_message.push(`${split_line}`);

            body_message.push(`Content-Disposition: form-data; name="rid"`);
            body_message.push(``);
            body_message.push(`${rid}`);
            body_message.push(`${split_line}`);

            body_message.push(`Content-Disposition: form-data; name="showProgress"`);
            body_message.push(``);
            body_message.push(`false`);
            body_message.push(`${end_line}`);

            this.#customHeaderRequest({
                headers: {
                    'User-Agent': `${this.appName}/${this.appVersion} (NodeJS_${process.env.NODE_VERSION}) ${os.platform()} (${os.arch()}) NodeJS Wrapper`,
                    'Content-Type': `multipart/form-data; boundary=---------------------------${CrsKey}`,
                    'Cookie': `PHPSESSID=${this.PHPSESSID}`,
                    'Host': `ldb.fabdigital.uk`,
                    'Origin': `https://ldb.fabdigital.uk`,
                    'Cache-Control': `no-cache`,
                    'Pragma': `no-cache`,
                    'Referer': `https://ldb.fabdigital.uk/`,
                    'Sec-Fetch-Dest': `empty`,
                    'Sec-Fetch-Mode': `cors`,
                    'Sec-Fetch-Site': `same-origin`,
                },
                uri: `${this.api_url}api/index.php?page=ldbws`,
                body: body_message.join('\n'),
                method: 'POST'
            }, function (err, res, body) {
                if (err) { reject(err); }
                resolve(JSON.parse(body));
            });
        });
    }

}

module.exports = Southernrail;