// Custom renderers to handle special types
// https://www.ag-grid.com/javascript-grid-cell-rendering-components/

import AttachmentCell from "./AttachmentCell/Button.svelte"
import ViewDetails from "./ViewDetails/Cell.svelte"
import Select from "./Select/Wrapper.svelte"
import DatePicker from "./DateTime/Wrapper.svelte"
import RelationshipLabel from "./Relationship/RelationshipLabel.svelte"

const renderers = new Map([
  ["boolean", booleanRenderer],
  ["attachment", attachmentRenderer],
  ["options", optionsRenderer],
  ["link", linkedRowRenderer],
  ["_id", viewDetailsRenderer],
])

export function getRenderer(schema, editable, SDK) {
  if (renderers.get(schema.type)) {
    return renderers.get(schema.type)(
      schema.options,
      schema.constraints,
      editable,
      SDK
    )
  } else {
    return false
  }
}

/* eslint-disable no-unused-vars */
function booleanRenderer(options, constraints, editable, SDK) {
  return params => {
    const toggle = e => {
      params.value = !params.value
      params.setValue(e.currentTarget.checked)
    }
    let input = document.createElement("input")
    input.style.display = "grid"
    input.style.placeItems = "center"
    input.style.height = "100%"
    input.type = "checkbox"
    input.checked = params.value
    if (editable) {
      input.addEventListener("click", toggle)
    } else {
      input.disabled = true
    }

    return input
  }
}
/* eslint-disable no-unused-vars */
function attachmentRenderer(options, constraints, editable, SDK) {
  return params => {
    const container = document.createElement("div")

    const attachmentInstance = new AttachmentCell({
      target: container,
      props: {
        files: params.value || [],
        SDK,
      },
    })

    const deleteFile = event => {
      const newFilesArray = params.value.filter(file => file !== event.detail)
      params.setValue(newFilesArray)
    }

    attachmentInstance.$on("delete", deleteFile)

    return container
  }
}
/* eslint-disable no-unused-vars */
function dateRenderer(options, constraints, editable, SDK) {
  return function(params) {
    const container = document.createElement("div")
    const toggle = e => {
      params.setValue(e.detail[0][0])
    }

    // Options need to be passed in with minTime and maxTime! Needs bbui update.
    new DatePicker({
      target: container,
      props: {
        value: params.value,
        SDK,
      },
    })

    return container
  }
}

function optionsRenderer(options, constraints, editable, SDK) {
  return params => {
    if (!editable) return params.value
    const container = document.createElement("div")
    container.style.display = "grid"
    container.style.placeItems = "center"
    container.style.height = "100%"
    const change = e => {
      params.setValue(e.detail)
    }

    const selectInstance = new Select({
      target: container,
      props: {
        value: params.value,
        options: constraints.inclusion,
        SDK,
      },
    })

    selectInstance.$on("change", change)

    return container
  }
}
/* eslint-disable no-unused-vars */
function linkedRowRenderer(options, constraints, editable, SDK) {
  return params => {
    let container = document.createElement("div")
    container.style.display = "grid"
    container.style.placeItems = "center"
    container.style.height = "100%"

    new RelationshipLabel({
      target: container,
      props: {
        row: params.data,
        columnName: params.column.colId,
        SDK,
      },
    })

    return container
  }
}

/* eslint-disable no-unused-vars */
function viewDetailsRenderer(options, constraints, editable, SDK) {
  return params => {
    let container = document.createElement("div")
    container.style.display = "grid"
    container.style.alignItems = "center"
    container.style.height = "100%"

    let url = "/"
    if (options.detailUrl) {
      url = options.detailUrl.replace(":id", params.data._id)
    }
    if (!url.startsWith("/")) {
      url = `/${url}`
    }

    new ViewDetails({
      target: container,
      props: {
        url,
        SDK,
      },
    })

    return container
  }
}
