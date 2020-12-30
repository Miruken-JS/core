import { True, Base, pcopy } from "core/base2";
import { type } from "core/design";
import { $decorate, $decorated } from "core/core";
import { disposable, $using } from "core/dispose";
import { Protocol, conformsTo } from "core/protocol";
import { Handler, $composer } from "callback/handler";
import { InferenceHandler } from "callback/inference-handler";
import { provides } from "callback/callback-policy";
import { singleton } from "callback/singleton-lifestyle";
import { Context, ContextState } from "context/context";
import { Contextual, contextual } from "context/contextual";

import { 
    scoped, scopedRooted, scopedQualifier
} from "context/contextual-lifestyle";

import "context/handler-context";

import { expect } from "chai";

describe("Context", () => {
    class Dog extends Base {}
    
    describe("#getState", () => {
        it("should start in the active state", () => {
            const context = new Context();
            expect(context.state).to.equal(ContextState.Active);
            expect(context.children).to.be.empty;
        });
    });
    
    describe("#getParent", () => {
        it("should not have a parent when root", () => {
            const context = new Context();
            expect(context.parent).to.not.exist;
        });
        
        it("should have a parent when a child", () => {
            const context = new Context(),
                  child   = context.newChild();
            expect(child.parent).to.equal(context);
        });
    });
    
    describe("#getChildren", () => {
        it("should have children when created", () => {
            const context = new Context(),
                  child1  = context.newChild(),
                  child2  = context.newChild();
            expect(context.children).to.include(child1, child2);
        });
    });
    
    describe("#hasChildren", () => {
        it("should not have children by default", () => {
            const context = new Context();
            expect(context.hasChildren).to.be.false;
        });
        
        it("should have children when created", () => {
            const context = new Context(),
                  child   = context.newChild();
            expect(context.hasChildren).to.be.true;
        });
    });
    
    describe("#getRoot", () => {
        it("should return self if no childern", () => {
            const context = new Context();
            expect(context.root).to.equal(context);
        });
        
        it("should return root context when descendant", () => {
            const context    = new Context(),
                  child      = context.newChild(),
                  grandChild = child.newChild();
            expect(grandChild.root).to.equal(context);
        });
    });

    describe("#newChild", () => {
        it("should return new child context", () => {
            const context      = new Context(),
                  childContext = context.newChild();
            expect(childContext.parent).to.equal(context);
        });

        it("should execute block with new child context and then end it", () => {
            const context      = new Context(),
                  childContext = context.newChild();
            $using(
                childContext, ctx => {
                    expect(ctx.state).to.equal(ContextState.Active);
                    expect(ctx.parent).to.equal(context); }
            );
            expect(childContext.state).to.equal(ContextState.Ended);
        });
    });

    describe("#resolve", () => {
        it("should resolve context to self", () => {
            const context = new Context();
            expect(context.resolve(Context)).to.equal(context);
        });
        
        it("should return root context when descendant", () => {
            const context    = new Context(),
                  child      = context.newChild(),
                  grandChild = child.newChild();
            expect(grandChild.root).to.equal(context);
        });
    });
    
    describe("#end", () => {
        it("should end the context", () => {
            const context = new Context();
            context.end();
            expect(context.state).to.equal(ContextState.Ended);
        });
        
        it("should end children", () => {
            const context = new Context(),
                  child   = context.newChild();
            context.end();
            expect(context.state).to.equal(ContextState.Ended);
            expect(child.state).to.equal(ContextState.Ended);
        });
    });

    describe("#dispose", () => {
        it("should end the context", () => {
            const context = new Context();
            context.dispose();
            expect(context.state).to.equal(ContextState.Ended);
        });
    });
    
    describe("#unwind", () => {
        it("should end children when unwinded", () => {
            const context = new Context(),
                  child1  = context.newChild(),
                  child2  = context.newChild();
            context.unwind();
            expect(context.state).to.equal(ContextState.Active);
            expect(child1.state).to.equal(ContextState.Ended);
            expect(child2.state).to.equal(ContextState.Ended);
        });
    });

    describe("#unwindToRootContext", () => {
        it("should end children except root and return it", () => {
            const context    = new Context(),
                  child1     = context.newChild(),
                  child2     = context.newChild(),
                  grandChild = child1.newChild(),
                  root       = context.unwindToRootContext();
            expect(root).to.equal(context);
            expect(context.state).to.equal(ContextState.Active);
            expect(child1.state).to.equal(ContextState.Ended);
            expect(child2.state).to.equal(ContextState.Ended);
            expect(grandChild.state).to.equal(ContextState.Ended);
        });
    });

    describe("#store", () => {
        it("should add object to the context", () => {
            const dog     = new Dog(),
                  context = new Context();
            expect(context.resolve(Dog)).to.be.undefined;
            context.store(dog);
            expect(context.resolve(Dog)).to.equal(dog);
        });
    });

    describe("#handle", () => {
        it("should traverse ancestors", () => {
            const dog        = new Dog(),
                  context    = new Context(),
                  child1     = context.newChild(),
                  child2     = context.newChild(),
                  grandChild = child1.newChild();
            context.store(dog);
            expect(grandChild.resolve(Dog)).to.equal(dog);
        });
    });

    describe("#handleAxis", () => {
        it("should wrap context", () => {
            const dog       = new Dog(),
                  context   = new Context(),
                  wrapped   = context.$self();
            context.store(dog);
            expect(wrapped).to.not.equal(context);
            expect(wrapped.constructor).to.equal(Context);
            expect(wrapped.addHandlers(dog)).to.equal(wrapped);
            expect(context.resolve(Dog)).to.equal(dog);
        });

        it("should traverse self", () => {
            const dog     = new Dog(),
                  context = new Context(),
                  child   = context.newChild();
            context.store(dog);
            expect(child.$self().resolve(Dog)).to.be.undefined;
            expect(context.$self().resolve(Dog)).to.equal(dog);
        });

        it("should traverse root", () => {
            const dog   = new Dog(),
                  root  = new Context(),
                  child = root.newChild();
            child.store(dog);
            expect(child.$root().resolve(Dog)).to.be.undefined;
            root.store(dog);
            expect(child.$root().resolve(Dog)).to.equal(dog);
        });

        it("should traverse children", () => {
            const dog        = new Dog(),
                  root       = new Context(),
                  child1     = root.newChild(),
                  child2     = root.newChild(),
                  child3     = root.newChild(),
                  grandChild = child3.newChild();
            child2.store(dog);
            expect(child2.$child().resolve(Dog)).to.be.undefined;
            expect(grandChild.$child().resolve(Dog)).to.be.undefined;
            expect(root.$child().resolve(Dog)).to.equal(dog);
        });

        it("should traverse siblings", () => {
            const dog        = new Dog(),
                  root       = new Context(),
                  child1     = root.newChild(),
                  child2     = root.newChild(),
                  child3     = root.newChild(),
                  grandChild = child3.newChild();
            child3.store(dog);
            expect(root.$sibling().resolve(Dog)).to.be.undefined;
            expect(child3.$sibling().resolve(Dog)).to.be.undefined;
            expect(grandChild.$sibling().resolve(Dog)).to.be.undefined;
            expect(child2.$sibling().resolve(Dog)).to.equal(dog);
        });

        it("should traverse children and self", () => {
            const dog        = new Dog(),
                  root       = new Context(),
                  child1     = root.newChild(),
                  child2     = root.newChild(),
                  child3     = root.newChild(),
                  grandChild = child3.newChild();
            child3.store(dog);
            expect(child1.$selfOrChild().resolve(Dog)).to.be.undefined;
            expect(grandChild.$selfOrChild().resolve(Dog)).to.be.undefined;
            expect(child3.$selfOrChild().resolve(Dog)).to.equal(dog);
            expect(root.$selfOrChild().resolve(Dog)).to.equal(dog);
        });

        it("should traverse siblings and self", () => {
            const dog        = new Dog(),
                  root       = new Context(),
                  child1     = root.newChild(),
                  child2     = root.newChild(),
                  child3     = root.newChild(),
                  grandChild = child3.newChild();
            child3.store(dog);
            expect(root.$selfOrSibling().resolve(Dog)).to.be.undefined;
            expect(grandChild.$selfOrSibling().resolve(Dog)).to.be.undefined;
            expect(child3.$selfOrSibling().resolve(Dog)).to.equal(dog);
            expect(child2.$selfOrSibling().resolve(Dog)).to.equal(dog);
        });

        it("should traverse ancestors", () => {
            const dog        = new Dog(),
                  root       = new Context(),
                  child      = root.newChild(),
                  grandChild = child.newChild();
            root.store(dog);
            expect(root.$ancestor().resolve(Dog)).to.be.undefined;
            expect(grandChild.$ancestor().resolve(Dog)).to.equal(dog);
        });

        it("should traverse ancestors or self", () => {
            const dog        = new Dog(),
                  root       = new Context(),
                  child      = root.newChild(),
                  grandChild = child.newChild();
            root.store(dog);
            expect(root.$selfOrAncestor().resolve(Dog)).to.equal(dog);
            expect(grandChild.$selfOrAncestor().resolve(Dog)).to.equal(dog);
        });

        it("should traverse descendants", () => {
            const dog        = new Dog(),
                  root       = new Context(),
                  child1     = root.newChild(),
                  child2     = root.newChild(),
                  child3     = root.newChild(),
                  grandChild = child3.newChild();
            grandChild.store(dog);
            expect(grandChild.$descendant().resolve(Dog)).to.be.undefined;
            expect(child2.$descendant().resolve(Dog)).to.be.undefined;
            expect(child3.$descendant().resolve(Dog)).to.equal(dog);
            expect(root.$descendant().resolve(Dog)).to.equal(dog);
        });

        it("should traverse descendants or self", () => {
            const dog        = new Dog(),
                  root       = new Context(),
                  child1     = root.newChild(),
                  child2     = root.newChild(),
                  child3     = root.newChild(),
                  grandChild = child3.newChild();
            grandChild.store(dog);
            expect(child2.$selfOrDescendant().resolve(Dog)).to.be.undefined;
            expect(grandChild.$selfOrDescendant().resolve(Dog)).to.equal(dog);
            expect(child3.$selfOrDescendant().resolve(Dog)).to.equal(dog);
            expect(root.$selfOrDescendant().resolve(Dog)).to.equal(dog);
        });

        it("should traverse descendants or |self|", () => {
            const dog        = new Dog(),
                  root       = new Context(),
                  child1     = root.newChild(),
                  child2     = root.newChild(),
                  child3     = root.newChild(),
                  grandChild = child3.newChild();
            root.store(dog);
            expect(child2.$selfOrDescendant().resolve(Dog)).to.be.undefined;
            expect(root.$selfSiblingOrAncestor().resolve(Dog)).to.equal(dog);
        });

        it("should traverse ancestor, |siblings| or self", () => {
            const dog        = new Dog(),
                  root       = new Context(),
                  child1     = root.newChild(),
                  child2     = root.newChild(),
                  child3     = root.newChild(),
                  grandChild = child3.newChild();
            child2.store(dog);
            expect(grandChild.$selfOrDescendant().resolve(Dog)).to.be.undefined;
            expect(child3.$selfSiblingOrAncestor().resolve(Dog)).to.equal(dog);
        });

        it("should traverse |ancestor|, siblings or self", () => {
            const dog        = new Dog(),
                  root       = new Context(),
                  child1     = root.newChild(),
                  child2     = root.newChild(),
                  child3     = root.newChild(),
                  grandChild = child3.newChild();
            child3.store(dog);
            expect(grandChild.$selfSiblingOrAncestor().resolve(Dog)).to.equal(dog);
        });

        it("should combine aspect with traversal", () => {
            let   count      = 0;
            const dog        = new Dog(),
                  root       = new Context(),
                  child1     = root.newChild(),
                  child2     = root.newChild(),
                  child3     = root.newChild(),
                  grandChild = child3.newChild();
            grandChild.store(dog);
            Context.implement({
                foo() { return this.$aspect(null, () => ++count); }
            });
            expect(child2.$selfOrDescendant().foo().resolve(Dog)).to.be.undefined;
            expect(grandChild.$selfOrDescendant().foo().resolve(Dog)).to.equal(dog);
            expect(child3.$selfOrDescendant().foo().resolve(Dog)).to.equal(dog);
            expect(root.$selfOrDescendant().foo().resolve(Dog)).to.equal(dog);
            expect(count).to.equal(4);            
        });        
    });

    describe("#observe", () => {
        it("should observe context end", () => {
            const context = new Context();
            let   ending  = false, ended = false;
            context.observe({
                contextEnding(ctx) { 
                    expect(ctx).to.equal(context);
                    ending = !ended; 
                },
                contextEnded(ctx) {
                    expect(ctx).to.equal(context);
                    ended  = true; 
                }
            });
            context.end();
            expect(ending).to.be.true;
            expect(ended).to.be.true;
        });
    });

    describe("#observe", () => {
        it("should observe child context end", () => {
            const context = new Context(),
                  child   = context.newChild();
            let   ending  = false, ended = false;
            context.observe({
                childContextEnding(ctx) {
                    expect(ctx).to.equal(child);
                    ending = !ended;
                },
                childContextEnded(ctx) {
                    expect(ctx).to.equal(child);
                    ended  = true; 
                }
            });
            child.end();
            expect(ending).to.be.true;
            expect(ended).to.be.true;
        });
    });

    describe("#observe", () => {
        it("can un-observe context end", () => {
            const context   = new Context();
            let   ending    = false, ended = false;
            const unobserve = context.observe({
                contextEnding(ctx) { 
                    expect(ctx).to.equal(context);
                    ending = !ended; 
                },
                contextEnded(ctx) {
                    expect(ctx).to.equal(context);
                    ended  = true; 
                }
            });
            unobserve();
            context.end();
            expect(ending).to.be.false;
            expect(ended).to.be.false;
        });
    });

    describe("#publish", () => {
        it("should publish to all descendants", () => {
            let   count     = 0;
            const Observing = Protocol.extend({
                      observe() {}
                  }),
                  Observer =
                      @conformsTo(Observing) 
                      class extends Base {
                          observe() { ++count; }
                      },
                  root       = new Context(),
                  child1     = root.newChild(),
                  child2     = root.newChild(),
                  child3     = root.newChild(),
                  grandChild = child3.newChild();
            root.addHandlers(new Observer());
            child1.addHandlers(new Observer());
            child1.addHandlers(new Observer());            
            child2.addHandlers(new Observer());
            child3.addHandlers(new Observer());
            child3.addHandlers(new Observer());
            Observing(root.$publish()).observe();
            expect(count).to.equal(6);
        });        
    });
});

describe("Contextual", () => {
    @contextual
    class Controller extends Base {}

    describe("#setContext", () => {
        it("should be able to set context", () => {
            const context    = new Context(),
                  controller = new Controller();
            controller.context = context;
            expect(controller.context).to.equal(context);
        });

        it("should add handler when context set", () => {
            const context    = new Context(),
                  controller = new Controller();
            controller.context = context;
            const resolve    = context.resolve(Controller);
            expect(resolve).to.equal(controller);
        });

        it("should remove handler when context cleared", () => {
            const context    = new Context(),
                  controller = new Controller();
            controller.context = context;
            const resolve    = context.resolve(Controller);
            expect(resolve).to.equal(controller);
            controller.context = null;
            expect(context.resolve(Controller)).to.be.undefined;
        });
    });

    describe("#isActiveContext", () => {
        it("should be able to test if context active", () => {
            const context    = new Context(),
                  controller = new Controller();
            controller.context = context;
            expect(controller.isActiveContext).to.be.true;
        });
    });

    describe("#endContext", () => {
        it("should be able to end context", () => {
            const context    = new Context(),
                  controller = new Controller();
            controller.context = context;
            controller.endContext();
            expect(context.state).to.equal(ContextState.Ended);
            expect(controller.isActiveContext).to.be.false;
        });
    });

    describe("#resolveContext", () => {
        it("should be resolve self", () => {
            const context = new Context();
            expect(context).to.equal(context.resolve(Context));
        });

        it("should be resolve decorated self", () => {
            const context = new Context(),
                  ctx     = $decorate(context, {
                               hello() {}
                            });
            expect(ctx).to.equal(ctx.resolve(Context));
            expect(context).to.equal($decorated(ctx.resolve(Context)));
        });
    });    

    describe("decorating contextual", () => {
        it("should decorate contextual", () => {
            const context     = new Context(),
                  controller  = new Controller(),
                  controllerx = pcopy(controller).extend({
                      set context(value) {
                          if (value == null) {
                              controller.context = null;
                          } else if (this.context != value) {
                              throw new Error("The context cannot be changed.");
                          }
                      }
                  });
            controller.context = context;
            expect(controller.context).to.equal(context);
            expect(controllerx.context).to.equal(context);
            expect(() => {
                controllerx.context = new Context();
            }).to.throw(Error, "The context cannot be changed.");
            controllerx.context = context;
            expect(controllerx.context).to.equal(context);
            controllerx.context = null;
            expect(controllerx.context).to.be.undefined;
            expect(controller.context).to.be.undefined;
        });
    });

    describe("ContextualLifestyle", () => {
        @provides() @scoped()
        @contextual @disposable class Screen {
            _dispose() {
                this.closed = true;
            }            
        }

        @provides() @scopedRooted()
        @contextual @disposable class Rooted {
            _dispose() {
                this.closed = true;
            }            
        }

        @provides() @singleton()
        class LifestyleMismatch {
            constructor(@type(Screen) screen) {}
        }

        it("should create scoped instances without qualifier", () => {
            let screen;
            $using(new Context(), context => {
                context.addHandlers(new InferenceHandler(Screen));
                screen = context.resolve(Screen);
                expect(screen).to.exist;
                expect(screen.context).to.equal(context);
                expect(screen).to.equal(context.resolve(Screen));
                expect(screen.closed).to.not.be.true;
                $using(context.newChild(), child => {
                    const screen2 = child.resolve(Screen);
                    expect(screen2).to.exist;
                    expect(screen2).to.equal(screen);
                    expect(child.parent).to.equal(screen2.context);
                });
            });
            expect(screen.closed).to.be.true;
        });

        it("should create scoped instances with qualifier", () => {
            let screen;
            $using(new Context(), context => {
                context.addHandlers(new InferenceHandler(Screen));
                screen = context.resolve(Screen);
                expect(screen).to.exist;
                expect(screen.context).to.equal(context);
                expect(screen).to.equal(context.resolve(Screen));
                expect(screen.closed).to.not.be.true;
                $using(context.newChild(), child => {
                    const screen2 = child.resolve(Screen,
                        c => c.require(scopedQualifier));
                    expect(screen2).to.exist;
                    expect(screen2).to.not.equal(screen);
                    expect(child).to.equal(screen2.context);
                });
            });
            expect(screen.closed).to.be.true;
        });

        it("should create rooted scoped instances with qualifier", () => {
            let rooted;
            $using(new Context(), context => {
                context.addHandlers(new InferenceHandler(Rooted));
                rooted = context.resolve(Rooted);
                expect(rooted).to.exist;
                expect(rooted.context).to.equal(context);
                expect(rooted).to.equal(context.resolve(Rooted));
                expect(rooted.closed).to.not.be.true;
                $using(context.newChild(), child => {
                    const rooted2 = child.resolve(Rooted,
                        c => c.require(scopedQualifier));
                    expect(rooted2).to.exist;
                    expect(rooted2).to.equal(rooted);
                    expect(context).to.equal(rooted2.context);
                });
            });
            expect(rooted.closed).to.be.true;
        });

        it("should create context getter/setter if not found", () => {
            @provides() @scoped()
            @conformsTo(Contextual) class Door {}

            let door;
            $using(new Context(), context => {
                context.addHandlers(new InferenceHandler(Door));
                door = context.resolve(Door);
                expect(door).to.exist;
                expect(door.context).to.equal(context);
                expect(door).to.equal(context.resolve(Door));
                $using(context.newChild(), child => {
                    const door2 = child.resolve(Door);
                    expect(door2).to.exist;
                    expect(door2).to.equal(door);
                    expect(child.parent).to.equal(door2.context);
                });
            });
        });

        it("should reject scoped creation if no context", () => {
            const screen = (new Handler()).resolve(Screen);
            expect(screen).to.not.exist;
        });

        it("should reject changing managed context", () => {
            $using(new Context(), context => {
                context.addHandlers(new InferenceHandler(Screen));
                const screen = context.resolve(Screen);
                expect(screen.context).to.equal(context);
                expect(() => {
                    screen.context = new Context();
                }).to.throw(Error, "The managed contextual instance cannot change context.");
            });
        });

        it("should detach from context when assigned null", () => {
            $using(new Context(), context => {
                context.addHandlers(new InferenceHandler(Screen));
                const screen = context.resolve(Screen);
                expect(screen.context).to.equal(context);
                screen.context = null;
                const screen2 = context.resolve(Screen);
                expect(screen2).to.exist;
                expect(screen2).to.not.equal(screen);
                expect(screen.closed).to.be.true;
            });
        });

        it("should reject changing managed context if evicted", () => {
            $using(new Context(), context => {
                context.addHandlers(new InferenceHandler(Screen));
                const screen = context.resolve(Screen);
                expect(screen.context).to.equal(context);
                screen.context = null;
                expect(() => {
                    screen.context = new Context();
                }).to.throw(Error, "The managed contextual instance has been evicted.");
            });
        });

        it("should reject scoped dependency in singleton", () => {
            $using(new Context(), context => {
                context.addHandlers(new InferenceHandler(Screen, LifestyleMismatch));
                const mismatch = context.resolve(LifestyleMismatch);
                expect(mismatch).to.not.exist;
            });        
        });
    });

    describe("$composer with resolving protocols", () => {
        const Foo = Protocol.extend({
            doFoo() { }
        });
        
        const Bar = Protocol.extend({
            doBar() { }
        });
        
        const FooHandler = @conformsTo(Foo) class extends Handler {
            doFoo() {
                const composer = $composer;
                expect(composer).to.not.be.null;
                return Bar(composer).doBar();
             }            
        }

        const BarHandler = @conformsTo(Bar) class extends Handler {
            constructor() {
                super();
                this.extend({
                    doBar() {
                        return "FizzBuzz";
                    }
                });
            }
        }
        
        it("$composer is defined", () => {
            const context = new Context();
            context.addHandlers(new FooHandler(), new BarHandler());
    
            const result = Foo(context).doFoo();
            expect(result).to.be.equal("FizzBuzz");
        });
    });
});
