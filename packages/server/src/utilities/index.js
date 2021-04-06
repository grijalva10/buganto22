const env = require("../environment")
const { DocumentTypes, SEPARATOR } = require("../db/utils")
const fs = require("fs")
const CouchDB = require("../db")

const APP_PREFIX = DocumentTypes.APP + SEPARATOR

function confirmAppId(possibleAppId) {
  return possibleAppId && possibleAppId.startsWith(APP_PREFIX)
    ? possibleAppId
    : undefined
}

exports.wait = ms => new Promise(resolve => setTimeout(resolve, ms))

exports.isDev = () => {
  return (
    !env.CLOUD &&
    env.NODE_ENV !== "production" &&
    env.NODE_ENV !== "jest" &&
    env.NODE_ENV !== "cypress"
  )
}

/**
 * Given a request tries to find the appId, which can be located in various places
 * @param {object} ctx The main request body to look through.
 * @returns {string|undefined} If an appId was found it will be returned.
 */
exports.getAppId = ctx => {
  let appId = confirmAppId(ctx.headers["x-budibase-app-id"])
  if (!appId) {
    appId = confirmAppId(env.CLOUD ? ctx.subdomains[1] : ctx.params.appId)
  }
  // look in body if can't find it in subdomain
  if (!appId && ctx.request.body && ctx.request.body.appId) {
    appId = confirmAppId(ctx.request.body.appId)
  }
  let appPath =
    ctx.request.headers.referrer ||
    ctx.path.split("/").filter(subPath => subPath.startsWith(APP_PREFIX))
  if (!appId && appPath.length !== 0) {
    appId = confirmAppId(appPath[0])
  }
  return appId
}

/**
 * Get the name of the cookie which is to be updated/retrieved
 * @param {string|undefined|null} name OPTIONAL can specify the specific app if previewing etc
 * @returns {string} The name of the token trying to find
 */
exports.getCookieName = (name = "builder") => {
  let environment = env.CLOUD ? "cloud" : "local"
  return `budibase:${name}:${environment}`
}

/**
 * Store a cookie for the request, has a hardcoded expiry.
 * @param {object} ctx The request which is to be manipulated.
 * @param {string} name The name of the cookie to set.
 * @param {string|object} value The value of cookie which will be set.
 */
exports.setCookie = (ctx, value, name = "builder") => {
  const expires = new Date()
  expires.setDate(expires.getDate() + 1)

  const cookieName = exports.getCookieName(name)
  if (!value) {
    ctx.cookies.set(cookieName)
  } else {
    ctx.cookies.set(cookieName, value, {
      expires,
      path: "/",
      httpOnly: false,
      overwrite: true,
    })
  }
}

/**
 * Utility function, simply calls setCookie with an empty string for value
 */
exports.clearCookie = (ctx, name) => {
  exports.setCookie(ctx, "", name)
}

exports.isClient = ctx => {
  return ctx.headers["x-budibase-type"] === "client"
}

/**
 * Recursively walk a directory tree and execute a callback on all files.
 * @param {String} dirPath - Directory to traverse
 * @param {Function} callback - callback to execute on files
 */
exports.walkDir = (dirPath, callback) => {
  for (let filename of fs.readdirSync(dirPath)) {
    const filePath = `${dirPath}/${filename}`
    const stat = fs.lstatSync(filePath)

    if (stat.isFile()) {
      callback(filePath)
    } else {
      exports.walkDir(filePath, callback)
    }
  }
}

exports.getLogoUrl = () => {
  return "https://d33wubrfki0l68.cloudfront.net/aac32159d7207b5085e74a7ef67afbb7027786c5/2b1fd/img/logo/bb-emblem.svg"
}

exports.getAllApps = async () => {
  let allDbs = await CouchDB.allDbs()
  const appDbNames = allDbs.filter(dbName => dbName.startsWith(APP_PREFIX))
  const appPromises = appDbNames.map(db => new CouchDB(db).get(db))
  if (appPromises.length === 0) {
    return []
  } else {
    const response = await Promise.allSettled(appPromises)
    return response
      .filter(result => result.status === "fulfilled")
      .map(({ value }) => value)
  }
}
