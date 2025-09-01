const pipotRoot = document.getElementById('pptroot')

const ELEMENT_TYPES = {
  TEXT: 'TEXT_ELEMENT'
}

// Top level API definition
const Pipot = {
  createElement,
  render
}

function createElement(type, props, ...children) {
  return {
    type,
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

function commitRoot() {
  commitWork(wipRoot.child)
  wipRoot = null
}

function commitWork(fiber) {
  if (!fiber) return

  const domParent = fiber.parent.dom
  domParent.appendChild(fiber.dom)
  commitWork(fiber.child)
  commitRoot(fiber.sibling)
}

function buildDom(fiber) {
  const isText = fiber.type === ELEMENT_TYPES.TEXT
  const isProperty = key => key !== 'children'

  const dom = isText
    ? document.createTextNode('')
    : document.createElement(fiber.type)

  Object.keys(fiber.props)
    .filter(isProperty)
    .forEach(name => {
      dom[name] = fiber.props[name] // if text, nodeValue will be set
    })

  return dom
}

function render(element, container) {
  // Root fiber is created here
  wipRoot = {
    dom: container,
    props: {
      children: [element]
    }
  }

  nextUnitOfWork = wipRoot
}

let nextUnitOfWork = null
let wipRoot = null

function workLoop(deadline) {
  // Will yield to the browser if idle time remaining is less than 1ms
  while (nextUnitOfWork && deadline.timeRemaining() > 1) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }

  if (!nextUnitOfWork && wipRoot) commitRoot()

  requestIdleCallback(workLoop)
}

function performUnitOfWork(fiber) {
  // Add DOM node
  if (!fiber.dom) fiber.dom = buildDom(fiber)

  // Create new fibers
  const children = fiber.props.children
  let index = 0
  let prevSibling = null

  while (index < children.length) {
    const element = children[index]

    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null
    }

    if (index === 0) fiber.child = newFiber
    else prevSibling.sibling = newFiber

    prevSibling = newFiber
    index++
  }

  // return the next unit of work
  if (fiber.child) return fiber.child

  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) return nextFiber.sibling
  }
  nextFiber = nextFiber.parent
}

requestIdleCallback(workLoop)

/** @jsx Pipot.createElement */
// The above line indicates babel to use Pipot.createElement to handle JSX

const elementTry = (
  <div>
    <h1>hello!</h1>
  </div>
)

Pipot.render(elementTry, pipotRoot)
