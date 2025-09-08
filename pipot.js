/** @jsx Pipot.createElement */
// The above line indicates babel to use Pipot.createElement to handle JSX

const ELEMENT_TYPES = {
  TEXT: 'TEXT_ELEMENT'
}

const EFFECTS = {
  UPDATE: 'UPDATE',
  PLACEMENT: 'PLACEMENT',
  DELETION: 'DELETION',
  EFFECT: 'EFFECT'
}

// Top level API definition
const Pipot = {
  createElement,
  render,
  useState,
  useEffect
}

let nextUnitOfWork = null
let wipRoot = null
let currentRoot = null
let deletions = null
let wipFiber = null
let hookIndex = null
let pendingEffects = []

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

function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    if (fiber.dom.parentNode === domParent) {
      domParent.removeChild(fiber.dom)
    }
  } else if (fiber.child) {
    commitDeletion(fiber.child, domParent)
  }
  if (fiber.sibling) {
    commitDeletion(fiber.sibling, domParent)
  }
}

function commitRoot() {
  deletions.forEach(commitWork)
  commitWork(wipRoot.child)
  currentRoot = wipRoot
  wipRoot = null
  console.log('in Root, pending:', { pendingEffects })
  pendingEffects.forEach(fn => fn())
  pendingEffects = []
}

function commitWork(fiber) {
  // commit phase
  if (!fiber) return
  const { effectTag, dom, alternate, props, parent, child, sibling } = fiber
  // find the nearest parent
  let domParentFiber = parent
  while (!domParentFiber.dom) domParentFiber = domParentFiber.parent
  const domParent = domParentFiber.dom

  // apply effects
  if (effectTag === EFFECTS.PLACEMENT && dom != null) {
    domParent.appendChild(dom)
  } else if (effectTag === EFFECTS.UPDATE && dom != null) {
    updateDom(dom, alternate.props, props)
  } else if (effectTag === EFFECTS.DELETION) {
    commitDeletion(fiber, domParent)
    return
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
      if (isEvent(name)) {
        const eventType = name.toLocaleLowerCase().substring(2)
        dom.addEventListener(eventType, fiber.props[name])
      } else {
        dom[name] = fiber.props[name] // if text, nodeValue will be set
      }
    })

  return dom
}

const isEvent = key => key.startsWith('on')
const isProperty = key => key !== 'children' && !isEvent(key)
const isGone = (_, next) => key => !(key in next)
const isNew = (prev, next) => key => prev[key] !== next[key]

function updateDom(dom, prevProps, nextProps) {
  const prevKeys = Object.keys(prevProps)
  const nextKeys = Object.keys(nextProps)
  // Remove old or changed event listeners
  prevKeys
    .filter(isEvent)
    .filter(key => {
      return !(key in nextProps) || isNew(prevProps, nextProps)(key)
    })
    .forEach(name => {
      const eventType = name.toLocaleLowerCase().substring(2)
      dom.removeEventListener(eventType, prevProps[name])
    })

  // Remove old properties
  prevKeys
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      dom[name] = ''
    })

  // Set new or updated properties
  nextKeys
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name]
    })

  // Add event listeners
  nextKeys
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name.toLocaleLowerCase().substring(2) // remove 'on'
      dom.addEventListener(eventType, nextProps[name])
    })
}

function render(element, container) {
  // Root fiber is created here
  // debugger;
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

function workLoop(deadline) {
  // Will yield to the browser if idle time remaining is less than 1ms
  // render phase starts
  while (nextUnitOfWork && deadline.timeRemaining() > 1) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }

  // commit phase starts
  if (!nextUnitOfWork && wipRoot) commitRoot()

  requestIdleCallback(workLoop)
}
requestIdleCallback(workLoop)

function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function

  // perform reconciliation
  if (isFunctionComponent) updateFunctionComponent(fiber)
  else updateHostComponent(fiber)

  // return the next unit of work
  if (fiber.child) return fiber.child

  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) return nextFiber.sibling
    nextFiber = nextFiber.parent
  }
}

function updateFunctionComponent(fiber) {
  wipFiber = fiber
  hookIndex = 0
  wipFiber.hooks = [] // hooks of the current function component
  const alternateFiber = wipFiber.alternate

  // on function components, the children are result of the execution
  const children = [fiber.type(fiber.props)] // fiber.type is the reference to the function
  reconcileChildren(fiber, children.flat())

  wipFiber.hooks.forEach((hook, idx) => {
    if (hook.effectTag === EFFECTS.EFFECT) {
      const oldHook =
        alternateFiber && alternateFiber.hooks && alternateFiber.hooks[idx]
      const depsChanged =
        !oldHook ||
        hook.deps.length !== oldHook.deps.length ||
        hook.deps.some((dep, i) => dep !== oldHook.deps[i])
      if (depsChanged) {
        pendingEffects.push(hook.fn)
      }
    }
  })
}

function updateHostComponent(fiber) {
  if (!fiber.dom) fiber.dom = buildDom(fiber)
  reconcileChildren(fiber, fiber.props.children.flat())
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

function useEffect(fn, deps) {
  const hook = {
    effectTag: EFFECTS.EFFECT,
    fn,
    deps
  }
  console.log(hook, 'effect hook')
  wipFiber.hooks.push(hook)
  hookIndex++
}

function useState(initialState) {
  // WIPFiber is the function component host of the state
  const oldHook =
    wipFiber.alternate &&
    wipFiber.alternate.hooks &&
    wipFiber.alternate.hooks[hookIndex]

  const hook = {
    state: oldHook ? oldHook.state : initialState,
    queue: []
  }

  const actions = oldHook ? oldHook.queue : []

  actions.forEach(action => (hook.state = action(hook.state)))
  const setState = action => {
    hook.queue.push(action)

    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot
    }

    // trigger a new render phase
    nextUnitOfWork = wipRoot
    deletions = []
  }

  wipFiber.hooks.push(hook)
  hookIndex++

  return [hook.state, setState]
}

const listOfGroceries = [
  'Milk',
  'Sugar',
  'Sour',
  'Boeing CH-47 Chinook',
  'Mil Mi-8/Mi-17 Hip'
]

function Container({ children }) {
  return (
    <div id="container">
      <h1>I'm inside container</h1>
      {children}
    </div>
  )
}

function App({ name }) {
  const [counter, setCounter] = Pipot.useState(0)
  const [isShown, setIsShown] = Pipot.useState(true)

  Pipot.useEffect(() => {
    console.log('hello!')
  }, [])

  return (
    <Container>
      <div>
        <h1>hello! {name}</h1>
        <button
          onClick={() => {
            setCounter(prev => prev + 1)
          }}
        >
          +
        </button>
        <h2>{counter}</h2>
        <ul>
          {listOfGroceries.map(gr => {
            return <li>{gr}</li>
          })}
        </ul>
      </div>
      <button onClick={() => setIsShown(prev => !prev)}>
        {isShown ? 'hide' : 'show'}
      </button>
      {isShown ? <h2>Please, don't hide me!</h2> : <h2>Show me!</h2>}
    </Container>
  )
}

const RootComponent = <App name={'Person'} />
const pipotRoot = document.getElementById('pptroot')
Pipot.render(RootComponent, pipotRoot)
