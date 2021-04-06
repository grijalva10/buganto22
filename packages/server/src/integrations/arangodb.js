const { Database, aql } = require("arangojs")
const { FIELD_TYPES, QUERY_TYPES } = require("./Integration")

const SCHEMA = {
  docs: "https://github.com/arangodb/arangojs",
  friendlyName: "ArangoDB",
  description:
    "ArangoDB is a scalable open-source multi-model database natively supporting graph, document and search. All supported data models & access patterns can be combined in queries allowing for maximal flexibility. ",
  datasource: {
    url: {
      type: FIELD_TYPES.STRING,
      default: "http://localhost:8529",
      required: true,
    },
    username: {
      type: FIELD_TYPES.STRING,
      default: "root",
      required: true,
    },
    password: {
      type: FIELD_TYPES.PASSWORD,
      required: true,
    },
    databaseName: {
      type: FIELD_TYPES.STRING,
      default: "_system",
      required: true,
    },
    collection: {
      type: FIELD_TYPES.STRING,
      required: true,
    },
  },
  query: {
    read: {
      type: QUERY_TYPES.SQL,
    },
    create: {
      type: QUERY_TYPES.JSON,
    },
  },
}

class ArangoDBIntegration {
  constructor(config) {
    config.auth = {
      username: config.username,
      password: config.password,
    }

    this.config = config
    this.client = new Database(config)
  }

  async read(query) {
    try {
      const result = await this.client.query(query.sql)
      return result.all()
    } catch (err) {
      console.error("Error querying arangodb", err.message)
      throw err
    } finally {
      this.client.close()
    }
  }

  async create(query) {
    const clc = this.client.collection(this.config.collection)
    try {
      const result = await this.client.query(
        aql`INSERT ${query.json} INTO ${clc} RETURN NEW`
      )
      return result.all()
    } catch (err) {
      console.error("Error querying arangodb", err.message)
      throw err
    } finally {
      this.client.close()
    }
  }
}

module.exports = {
  schema: SCHEMA,
  integration: ArangoDBIntegration,
}
