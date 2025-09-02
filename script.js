const pipotRoot = document.getElementById('pptroot')

const ELEMENT_TYPES = {
  TEXT: 'TEXT_ELEMENT'
}

const EFFECTS = {
  UPDATE: 'UPDATE',
  PLACEMENT: 'PLACEMENT',
  DELETION: 'DELETION'
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
  deletions.forEach(commitWork)
  commitWork(wipRoot.child)
  currentRoot = wipRoot
  wipRoot = null
}

function commitWork(fiber) {
  // commit phase
  if (!fiber) return
  const { effectTag, dom, alternate, props, parent, child, sibling } = fiber
  const domParent = parent.dom

  // apply effects

  if (effectTag === EFFECTS.PLACEMENT && dom != null) {
    domParent.appendChild(dom)
  } else if (effectTag === EFFECTS.UPDATE && dom != null) {
    updateDom(dom, alternate.props, props)
  } else if (effectTag === EFFECTS.DELETION) {
    domParent.removeChild(dom)
  }

  commitWork(child)
  commitWork(sibling)
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

const isEvent = key => key.startsWith('on')
const isProperty = key => key !== 'children' && isEvent(key)
const isGone = (_, next) => key => !(key in next)
const isNew = (prev, next) => key => prev[key] !== next[key]

function updateDom(dom, prevProps, nextProps) {
  // Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(key => {
      return !(key in nextProps) || isNew(prevProps, nextProps)(key)
    })
    .forEach(name => {
      const eventType = name.toLocaleLowerCase().substring(2)
      dom.removeEventListener(eventType, prevProps[name])
    })

  // Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      dom[name] = ''
    })

  // Set new or updated properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name]
    })

  // Add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name.toLocaleLowerCase().substring(2) // remove 'on'
      dom.addEventListener(eventType, nextProps[name])
    })
}

function render(element, container) {
  // Root fiber is created here
  wipRoot = {
    dom: container, // DOM node reference
    props: {
      children: [element]
    },
    alternate: currentRoot
  }

  deletions = []
  nextUnitOfWork = wipRoot // once nextUnitOfWork is not null, work starts
}

let nextUnitOfWork = null
let wipRoot = null
let currentRoot = null
let deletions = null

function workLoop(deadline) {
  // Will yield to the browser if idle time remaining is less than 1ms
  while (nextUnitOfWork && deadline.timeRemaining() > 1) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }

  // commit phase starts
  if (!nextUnitOfWork && wipRoot) commitRoot()

  requestIdleCallback(workLoop)
}
requestIdleCallback(workLoop)

function performUnitOfWork(fiber) {
  // Add DOM node
  if (!fiber.dom) fiber.dom = buildDom(fiber)

  // perform reconciliation
  reconcileChildren(fiber, fiber.props.children)

  // return the next unit of work
  if (fiber.child) return fiber.child

  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) return nextFiber.sibling
    nextFiber = nextFiber.parent
  }
}

function reconcileChildren(wipFiber, elements) {
  let index = 0
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling = null

  while (index < elements.length || oldFiber != null) {
    // The element is the thing we want to render to the DOM and the oldFiber is what we rendered the last time.
    const element = elements[index]
    let newFiber = null

    const sameType = oldFiber && element && element.type == oldFiber.type

    if (sameType) {
      // update node
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: EFFECTS.UPDATE // used during commit phase
      }
    }

    if (element && !sameType) {
      // replace dom node
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: EFFECTS.PLACEMENT
      }
    }

    if (oldFiber && !sameType) {
      // delete oldFiber node
      oldFiber.effectTag = EFFECTS.DELETION
      deletions.push(oldFiber)
    }

    if (oldFiber) oldFiber = oldFiber.sibling
    if (index === 0) wipFiber.child = newFiber
    else prevSibling.sibling = newFiber

    prevSibling = newFiber
    index++
  }
}

/** @jsx Pipot.createElement */
// The above line indicates babel to use Pipot.createElement to handle JSX

const elementTry = (
  <div>
    <h1>hello!</h1>
  </div>
)

Pipot.render(elementTry, pipotRoot)
