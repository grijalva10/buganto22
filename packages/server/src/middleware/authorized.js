const {
  BUILTIN_ROLE_IDS,
  getUserPermissions,
} = require("../utilities/security/roles")
const {
  PermissionTypes,
  doesHaveResourcePermission,
  doesHaveBasePermission,
} = require("../utilities/security/permissions")
const env = require("../environment")
const { isAPIKeyValid } = require("../utilities/security/apikey")
const { AuthTypes } = require("../constants")

const ADMIN_ROLES = [BUILTIN_ROLE_IDS.ADMIN, BUILTIN_ROLE_IDS.BUILDER]

const LOCAL_PASS = new RegExp(["webhooks/trigger"].join("|"))

function hasResource(ctx) {
  return ctx.resourceId != null
}

module.exports = (permType, permLevel = null) => async (ctx, next) => {
  // webhooks can pass locally
  if (!env.CLOUD && LOCAL_PASS.test(ctx.request.url)) {
    return next()
  }

  if (env.CLOUD && ctx.headers["x-api-key"] && ctx.headers["x-instanceid"]) {
    // api key header passed by external webhook
    if (await isAPIKeyValid(ctx.headers["x-api-key"])) {
      ctx.auth = {
        authenticated: AuthTypes.EXTERNAL,
        apiKey: ctx.headers["x-api-key"],
      }
      ctx.user = {
        appId: ctx.headers["x-instanceid"],
      }
      return next()
    }

    return ctx.throw(403, "API key invalid")
  }

  // don't expose builder endpoints in the cloud
  if (env.CLOUD && permType === PermissionTypes.BUILDER) return

  if (!ctx.user) {
    return ctx.throw(403, "No user info found")
  }

  const role = ctx.user.role
  const { basePermissions, permissions } = await getUserPermissions(
    ctx.appId,
    role._id
  )
  const isAdmin = ADMIN_ROLES.includes(role._id)
  const isAuthed = ctx.auth.authenticated

  // this may need to change in the future, right now only admins
  // can have access to builder features, this is hard coded into
  // our rules
  if (isAdmin && isAuthed) {
    return next()
  } else if (permType === PermissionTypes.BUILDER) {
    return ctx.throw(403, "Not Authorized")
  }

  if (
    hasResource(ctx) &&
    doesHaveResourcePermission(permissions, permLevel, ctx)
  ) {
    return next()
  }

  if (!isAuthed) {
    ctx.throw(403, "Session not authenticated")
  }

  if (!doesHaveBasePermission(permType, permLevel, basePermissions)) {
    ctx.throw(403, "User does not have permission")
  }

  return next()
}
