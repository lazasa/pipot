const pipotRoot = document.getElementById('pptroot')

const ELEMENT_TYPES = {
  TEXT: 'TEXT_ELEMENT'
}

// Top level API definition
const Pipot = {
  createElement,
  render
}

// JSX handling, VDOM building
function createElement(name, props, ...children) {
  return {
    name,
    props: {
      ...props,
      children: children.map(child => {
        const node =
          typeof child === 'object' ? child : createTextElement(child)

        return node
      })
    }
  }
}

function createTextElement(text) {
  return {
    type: ELEMENT_TYPES.TEXT,
    props: {
      nodeValue: text,
      children: []
    }
  }
}

function render(element, container) {
  const isText = element.type === ELEMENT_TYPES.TEXT
  const isProperty = key => key !== 'children'

  const dom = isText
    ? document.createTextNode('')
    : document.createElement(element.type)

  Object.keys(element.props)
    .filter(isProperty)
    .forEach(name => {
      dom[name] = element.props[name] // if text, nodeValue will be set
    })

  element.props.children.forEach(child => render(child, dom))

  container.appendChild(dom)
}

/** @jsx Pipot.createElement */
// The above line indicates babel to use Pipot.createElement to handle JSX

const elementTry = (
  <div>
    <h1>hello!</h1>
  </div>
)

Pipot.render(elementTry, pipotRoot)
