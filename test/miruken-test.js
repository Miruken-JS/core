var miruken = require('../lib/miruken.js'),
    Promise = require('bluebird'),
    chai    = require("chai"),
    expect  = chai.expect;

eval(base2.namespace);
eval(base2.js.namespace);
eval(miruken.namespace);

new function () { // closure

    var miruken_test = base2.package(this, {
        name:    "miruken_test",
        exports: "Animal,Tricks,CircusAnimal,Dog,Elephant,AsianElephant,Tracked,ShoppingCart,LogInterceptor"
    });

    eval(this.imports);

    var Animal = Protocol.extend({
        $properties: {
            name: undefined
        },
        talk: function () {},
        eat:  function (food) {}
    });
    
    var Tricks = Protocol.extend({
        fetch: function (item) {}
    });
    
    var CircusAnimal = Animal.extend(Tricks, {
    });
    
    var Dog = Base.extend(Animal, Tricks,
        $inferProperties, {
        constructor: function (name, color) {
           this.extend({
               getName: function () { return name; },
               setName: function (value) { name = value; },
               get color() { return color; },
               set color(value) { color = value; }
           });
        },
        talk: function () { return 'Ruff Ruff'; },
        fetch: function (item) { return 'Fetched ' + item; }
    });
    
    var Elephant = Base.extend(CircusAnimal, {
    });
    
	var Tracked = Protocol.extend({
		getTag: function () {}
	});

    var AsianElephant = Elephant.extend(Tracked);

    var ShoppingCart = Base.extend(Disposing, DisposingMixin, {
        constructor: function () {
            var _items = [];
            this.extend({
                getItems: function () { return _items; },
                addItem: function (item) { _items.push(item); }, 
                _dispose: function () { _items = []; }
            });
        }
    });

    var LogInterceptor = Interceptor.extend({
        intercept: function (invocation) {
            console.log(lang.format("Called %1 with (%2) from %3",
                        invocation.method,
                        invocation.args.join(", "), 
                        invocation.source));
            var result = invocation.proceed();
            console.log(lang.format("    And returned %1", result));
            return result;
        }
    });

    eval(this.exports);
};

eval(base2.miruken_test.namespace);

describe("miruken", function () {
    it("should be in global namespace", function () {
        expect(global.miruken).to.equal(base2.miruken);
    });

    it("should late bind", function () {
        var Pincher = Dog.extend({
            get name() { return "YO " + this.base(); }
        });
        var p = new Pincher("Poo");
        expect(p.name).to.equal("Poo");
        p.name = "Do";
        expect(p.name).to.equal("Do");        
    });    
});

describe("Enum", function () {
    var Color = Enum({red: 1, blue: 2, green: 3}),
        Message = Enum({run: "run", cancel: "cancel" });

    describe("#name", function () {
        it("should obtain name", function () {
            expect(Color.red.name).to.equal("red");
            expect(Color.blue.name).to.equal("blue");
            expect(Color.green.name).to.equal("green");
            expect(Message.run.name).to.equal("run");
            expect(Message.cancel.name).to.equal("cancel");                        
        });
    });
    
    describe("#value", function () {
        it("should obtain value", function () {
            expect(Color.red.value).to.equal(1);
            expect(Color.blue.value).to.equal(2);
            expect(Color.green.value).to.equal(3);
            expect(Message.run.value).to.equal("run");
            expect(Message.cancel.value).to.equal("cancel");            
        });
    });

    describe("#ordinal", function () {
        it("should obtain ordinal", function () {
            expect(Color.red.ordinal).to.equal(0);
            expect(Color.blue.ordinal).to.equal(1);
            expect(Color.green.ordinal).to.equal(2);
            expect(Message.run.ordinal).to.equal(0);
            expect(Message.cancel.ordinal).to.equal(1);
        });
    });

    describe("#valueOf", function () {
        it("should obtain value", function () {
            expect(+Color.red).to.equal(1);
            expect(+Color.blue).to.equal(2);
            expect(+Color.green).to.equal(3);
            expect(+Message.run).to.equal(0);
            expect(+Message.cancel).to.equal(1);            
        });
    });

    describe("#toString", function () {
        it("should convert to string", function () {
            expect(Color.red.toString()).to.equal("red");
            expect(Color.blue.toString()).to.equal("blue");
            expect(Color.green.toString()).to.equal("green");
            expect(Message.run.toString()).to.equal("run");
            expect(Message.cancel.toString()).to.equal("cancel");                        
        });
    });

    describe("#names", function () {
        it("should obtain all names", function () {
            expect(Color.names).to.include("red", "blue", "green");
        });
    });

    describe("#fromValue", function () {
        it("should obtain enum from value", function () {
            expect(Color(1)).to.equal(Color.red);
            expect(Color("2")).to.equal(Color.blue);
            expect(Color(Color.green)).to.equal(Color.green);
            expect(Message("run")).to.equal(Message.run);
            expect(Message(Message.cancel)).to.equal(Message.cancel);
        });

        it("should throw exception if invalid value", function () {
            expect(function () {
                var color = Color(10);
            }).to.throw(Error, /10 is not a valid value for this Enum./);            
        });
    });
    
    it("should support logical operations", function () {
        expect(Color.red == Color.red).to.be.true;
        expect(Color.red === Color.red).to.be.true
        expect(Color.red != Color.blue).to.be.true;
        expect(Color.red !== Color.blue).to.be.true;
        expect(Color.red < Color.blue).to.be.true;
        expect(Color.red <= Color.red).to.be.true;
        expect(Color.green > Color.blue).to.be.true;
        expect(Color.green >= Color.blue).to.be.true;
    });
    
    it("should be immutable", function () {
        expect(Color.prototype).to.be.instanceOf(Enum);
        Color.black = 4;
        expect(Color.black).to.be.undefined;
    });

    it("should reject enum construction", function () {
        expect(function () { 
            new Color(2);
        }).to.throw(Error, /Enums cannot be instantiated./);
    });

    it("should extend enum class", function () {
        Color.implement({
            get rgb() { return "#FFFFFF"; },
            get displayName() { return this.name; }
        });
        expect(Color.red.rgb).to.equal("#FFFFFF");
        expect(Color.green.displayName).to.equal("green");        
    });    
});

describe("Flags", function () {
    var DayOfWeek = Flags({
        Monday:    1,
        Tuesday:   2,
        Wednesday: 4,
        Thursday:  8,
        Friday:    16,
        Saturday:  32,
        Sunday:    64,
        Weekday:   31,
        Weekend:   96
    });

    describe("#value", function () {
        it("should obtain value", function () {
            expect(DayOfWeek.Monday.value).to.equal(1);
            expect(DayOfWeek.Tuesday.value).to.equal(2);            
        });
    });

    describe("#name", function () {
        it("should obtain name", function () {
            expect(DayOfWeek.Monday.name).to.equal("Monday");
            expect(DayOfWeek.Tuesday.name).to.equal("Tuesday");
            expect(DayOfWeek(21).name).to.equal("Monday,Wednesday,Friday");
            expect(DayOfWeek.Weekend.name).to.equal("Weekend");            
        });
    });

    describe("#valueOf", function () {
        it("should obtain value", function () {
            expect(+DayOfWeek.Friday).to.equal(16);
            expect(+DayOfWeek.Weekend).to.equal(96);            
        });
    });

    describe("#toString", function () {
        it("should convert to string", function () {        
            expect(DayOfWeek.Wednesday.toString()).to.equal("Wednesday");
            expect(DayOfWeek(21).toString()).to.equal("Monday,Wednesday,Friday");
            expect(DayOfWeek.Weekend.toString()).to.equal("Weekend");            
        });
    });
    
    describe("#names", function () {
        it("should obtain all names", function () {
            expect(DayOfWeek.names).to.include(
                "Monday", "Tuesday", "Wednesday",
                "Thursday", "Friday", "Saturday", "Sunday");            
        });
    });

    describe("#fromValue", function () {
        it("should obtain enum from value", function () {
            expect(DayOfWeek(1)).to.equal(DayOfWeek.Monday);
            expect(DayOfWeek("4")).to.equal(DayOfWeek.Wednesday);
            expect(DayOfWeek(DayOfWeek.Friday) === DayOfWeek.Friday).to.be.true;
            expect(DayOfWeek(21).value).to.equal(21);
            expect(DayOfWeek.Saturday | DayOfWeek.Sunday).to.equal(+DayOfWeek.Weekend);
            expect(DayOfWeek(DayOfWeek.Saturday | DayOfWeek.Sunday)).to.equal(DayOfWeek.Weekend);            
        });        
    });

    describe("#hasFlag", function () {
        it("should test enum flag", function () {
            expect(DayOfWeek.Tuesday.hasFlag(DayOfWeek.Tuesday)).to.be.true;
            expect(DayOfWeek(8).hasFlag(DayOfWeek.Thursday)).to.be.true;
            expect(DayOfWeek(16).hasFlag(DayOfWeek.Monday)).to.be.false;
            expect(DayOfWeek.Weekend.hasFlag(DayOfWeek.Sunday)).to.be.true;
            expect(DayOfWeek.Weekday.hasFlag(2)).to.be.true;            
        });        
    });    
});

describe("$meta", function () {
    it("should have class metadata", function () {
        expect(Dog.$meta).to.be.ok;
    });

    it("should not be able to delete class metadata", function () {
        expect(Dog.$meta).to.be.ok;
        delete Dog.$meta;
        expect(Dog.$meta).to.be.ok;
    });

    it("should have instance metadata", function () {
        var dog = new Dog;
        expect(dog.$meta).to.be.ok;
        expect(dog.$meta).to.not.equal(Dog.$meta);
    });

    it("should not be able to delete instance metadata", function () {
        var dog = new Dog;
        expect(Dog.$meta).to.be.ok;
        delete dog.$meta;
        expect(Dog.$meta).to.be.ok;
    });
});

describe("$isClass", function () {
    it("should identify miruken classes", function () {
        expect($isClass(Dog)).to.be.true;
    });

    it("should reject non-miruken classes", function () {
        var SomeClass = function () {};
        expect($isClass(SomeClass)).to.be.false;
    });
});

describe("$isFunction", function () {
    it("should identify functions", function () {
        var fn = function () {};
        expect($isFunction(fn)).to.be.true;
    });

    it("should reject no functions", function () {
        expect($isFunction(1)).to.be.false;
        expect($isFunction("hello")).to.be.false;
    });
});

describe("$properties", function () {
    var Person = Base.extend({
        $properties: {
            firstName: '',
            lastName:  '',
            fullName:  {
                get: function () {
                    return this.firstName + ' ' + this.lastName;
                },
                set: function (value) {
                    var parts = value.split(' ');
                    if (parts.length > 0) {
                        this.firstName = parts[0];
                    }
                    if (parts.length > 1) {
                        this.lastName = parts[1];
                    }
                }
            },
            dob: { auto: null },
            pet:  { map: Animal}
        },
        get age() { return ~~((Date.now() - +this.dob) / (31557600000)); }
    });
    var Doctor = Person.extend({
        $properties: {
            patient: { map: Person }
        },
        get age() { return this.base() + 10; }
    });

    it("should ignore empty properties", function () {
        var Person = Base.extend({
            $properties: {}
        });
    });

    it("should synthesize properties", function () {
        var person = new Person,
            friend = new Person;
        expect(person.firstName).to.equal('');
        expect(person.lastName).to.equal('');
        person.firstName = 'John';
        expect(person.firstName).to.equal('John');
        expect(person._firstName).to.be.undefined;
        person.firstName = 'Sarah';
        expect(person.firstName).to.equal('Sarah');
        expect(friend.firstName).to.equal('');
        expect(person.$properties).to.be.undefined;
    });

    it("should synthesize value properties", function () {
        var person       = new Person;
        person.firstName = 'Mickey';
        person.lastName  = 'Mouse';
        expect(person.fullName).to.equal('Mickey Mouse');
    });

    it("should synthesize property setters ", function () {
        var person       = new Person;
        person.fullName  = 'Harry Potter';
        expect(person.firstName).to.equal('Harry');
        expect(person.lastName).to.equal('Potter');
    });

    it("should accept standard properties", function () {
        var person = new Person;
        person.dob = new Date(2003, 4, 9);
        expect(person.dob).to.eql(new Date(2003, 4, 9));
        expect(person.age).to.be.at.least(12);
    });

    it("should override standard properties", function () {
        var doctor = new Doctor;
        doctor.dob = new Date;
        expect(doctor.age).to.be.at.least(10);
    });

    it("should retrieve property descriptor", function () {
        var descriptor = Doctor.$meta.getDescriptor('patient');
        expect(descriptor.map).to.equal(Person);
    });

    it("should merge property descriptor with getter/setter", function () {
        var Hospital = Base.extend({
                $properties: {
                    chiefDoctor: { map: Doctor }
                },
                get chiefDoctor() {
                    return new Doctor({firstName: "Phil"});
                }
        }),
            descriptor = Hospital.$meta.getDescriptor('chiefDoctor');
            hospital = new Hospital;
        expect(hospital.chiefDoctor.firstName).to.equal("Phil");
        expect(descriptor.map).to.equal(Doctor);        
    });

    it("should retrieve inherited property descriptor", function () {
        var descriptor = Doctor.$meta.getDescriptor('pet');
        expect(descriptor.map).to.equal(Animal);
    });

    it("should retrieve all property descriptors", function () {
        var descriptors = Doctor.$meta.getDescriptor();
        expect(descriptors['pet'].map).to.equal(Animal);
        expect(descriptors['patient'].map).to.equal(Person);
    });

    it("should filter property descriptors", function () {
        var Something = Base.extend({
            $properties: {
                matchBool:   { val: true },
                matchNumber: { val: 22 },
                matchString: { val: "Hello" },
                matchArray:  { val: ["a", "b", "c"] },
                matchNested: {
                    nestedBool: { val: false },
                    nestedNumber: { val: 19 },
                    nestedString: { val: "Goodbye" },
                    nestedArray:  { val: ["x", "y", "z"] }
                }
            }
        });

        var descriptors = Something.$meta.getDescriptor({ val: false });
        expect(descriptors).to.be.undefined;
        descriptors = Something.$meta.getDescriptor({ val: true });
        expect(descriptors).to.eql({ matchBool: { val: true } });
        descriptors = Something.$meta.getDescriptor({ val: 22 });
        expect(descriptors).to.eql({ matchNumber: { val: 22 } });
        descriptors = Something.$meta.getDescriptor({ val: 22 });
        expect(descriptors).to.eql({ matchNumber: { val: 22 } });
        descriptors = Something.$meta.getDescriptor({ val: "Hello" });
        expect(descriptors).to.eql({ matchString: { val: "Hello" } });
        descriptors = Something.$meta.getDescriptor({ val: ["z"] });
        expect(descriptors).to.be.undefined;
        descriptors = Something.$meta.getDescriptor({ val: ["b"] });
        expect(descriptors).to.eql({ matchArray: { val: ["a", "b", "c" ] } });
        descriptors = Something.$meta.getDescriptor({ nestedBool: { val: false } });
        expect(descriptors).to.eql({  
              matchNested: {
                    nestedBool: { val: false },
                    nestedNumber: { val: 19 },
                    nestedString: { val: "Goodbye" },
                    nestedArray:  { val: ["x", "y", "z"] }
                }});
        descriptors = Something.$meta.getDescriptor({ nestedBool: undefined });
        expect(descriptors).to.eql({  
              matchNested: {
                    nestedBool: { val: false },
                    nestedNumber: { val: 19 },
                    nestedString: { val: "Goodbye" },
                    nestedArray:  { val: ["x", "y", "z"] }
                }});

    });

    it("should synthesize instance properties", function () {
        var person = (new Person).extend({
            $properties: {
                hairColor: 'brown',
                glasses:    true
            }
        });
        expect(person.hairColor).to.equal('brown');
        expect(person.glasses).to.equal(true);
        expect(person.$properties).to.be.undefined;
    });

    it("should retrieve instance property descriptor", function () {
        var person = (new Person).extend({
            $properties: {
                friend: { map: Person }
            }
        });
        var descriptor = person.$meta.getDescriptor('friend');
        expect(descriptor.map).to.equal(Person);
        expect(Person.$meta.getDescriptor('friend')).to.be.undefined;
    });

    it("should synthesize protocol properties", function () {
        var Employment = Protocol.extend({
                get id() {},
                get name() {},
                set name(value) {}
            }),
            Manager = Base.extend(Employment, {
                constructor: function (name) {
                    this.extend({
                        get name() { return name; },
                        set name(value) { name = value; }
                    });
                },
                get id() {
                    return "Manager" + assignID(this);
                }
            }),
            manager = new Manager("Bill Lumbergh");
        expect(Employment(manager).name).to.equal("Bill Lumbergh");
        expect(Employment(manager).id).to.equal("Manager" + assignID(manager));
        expect(Employment(manager).name = "Joe Girardi").to.equal("Joe Girardi");
        expect(Employment(manager).name).to.equal("Joe Girardi");
    });    
});

describe("$inferProperties", function () {
    var Person = Base.extend( 
        $inferProperties, {
        constructor: function (firstName) {
            this.firstName = firstName;
        },
        getFirstName: function () { return this._name; },
        setFirstName: function (value) { this._name = value; },
        getInfo: function (key) { return ""; },
        setKeyValue: function (key, value) {}
    });
    
    it("should infer instance properties", function () {
        var person = new Person('Sean');
        expect(person.firstName).to.equal('Sean');
        expect(person.getFirstName()).to.equal('Sean');
    });

    it("should not infer getters with arguments", function () {
        expect(Person.prototype).to.not.have.key('info');
    });

    it("should not infer setters unless 1 argument", function () {
        expect(Person.prototype).to.not.have.key('keyValue');
    });

    it("should infer extended properties", function () {
        var Doctor = Person.extend({
                constructor: function (firstName, speciality) {
                    this.base(firstName);
                    this.speciality = speciality;
                },
                getSpeciality: function () { return this._speciality; },
                setSpeciality: function (value) { this._speciality = value; }
            }),
            Surgeon = Doctor.extend({
                constructor: function (firstName, speciality, hospital) {
                    this.base(firstName, speciality);
                    this.hospital = hospital;
                },
                getHospital: function () { return this._hospital; },
                setHospital: function (value) { this._hospital = value; }
            }),
            doctor  = new Doctor('Frank', 'Orthopedics'),
            surgeon = new Surgeon('Brenda', 'Cardiac', 'Baylor');
        expect(doctor.firstName).to.equal('Frank');
        expect(doctor.getFirstName()).to.equal('Frank');
        expect(doctor.speciality).to.equal('Orthopedics');
        expect(doctor.getSpeciality()).to.equal('Orthopedics');
        expect(surgeon.firstName).to.equal('Brenda');
        expect(surgeon.getFirstName()).to.equal('Brenda');
        expect(surgeon.speciality).to.equal('Cardiac');
        expect(surgeon.getSpeciality()).to.equal('Cardiac');
        expect(surgeon.hospital).to.equal('Baylor');
        expect(surgeon.getHospital()).to.equal('Baylor');
    });

    it("should infer implemented properties", function () {
        Person.implement({
            getMother: function () { return this._mother; },
            setMother: function (value) { this._mother = value; } 
        });
        var mom = new Person,
            son = new Person;
        son.mother = mom;
        expect(son.mother).to.equals(mom);
        expect(son.getMother()).to.equal(mom);
    });

    it("should infer extended instance properties", function () {
        var person = new Person;
        person.extend({
            getAge: function () { return this._age; },
            setAge: function (value) { this._age = value; }
        });
        person.age = 23;
        expect(person.age).to.equal(23);
        expect(person.getAge()).to.equal(23);
    });

    it("should support property overrides", function () {
        var Teacher = Person.extend({
                getFirstName: function () { return 'Teacher ' + this.base(); }
            }),
            teacher = new Teacher('Jane');
        expect(teacher.firstName).to.equal('Teacher Jane');
        Teacher.implement({
            setFirstName: function (value) { this.base('Sarah'); }
        });                        
        teacher.firstName = 'Mary';
        expect(teacher.firstName).to.equal('Teacher Sarah');
    });
});

describe("$inheritStatic", function () {
    var Math = Base.extend(
        $inheritStatic, null, {
            PI: 3.14159265359,
            add: function (a, b) {
                return a + b;
            }
        }), 
        Geometry = Math.extend(null, {
            area: function(length, width) {
                return length * width;
            }
        });
    
    it("should inherit static members", function () {
        expect(Geometry.PI).to.equal(Math.PI);
        expect(Geometry.add).to.equal(Math.add);
    });
});

describe("Miruken", function () {
    it("should be in global namespace", function () {
        expect(global.Miruken).to.equal(base2.miruken.Miruken);
    });

    it("should pass arguments to base", function () {
        var Something = Miruken.extend({
            constructor: function () {
                this.base({name: 'Larry'});
            }
        }),
        something = new Something;
        expect(something.name).to.equal('Larry');
    });

    it("should perform coercion by default", function () {
        var Pet = Miruken.extend({
                constructor: function (name) {
                    this.extend({
                        getName: function () { return name; }
                    });
                }
            }),
            pet = Pet('Spike');
        expect(pet).to.be.instanceOf(Pet);
        expect(pet.getName()).to.equal('Spike');
    });
});

describe("DisposingMixin", function () {
    describe("dispose", function () {
        it("should provide dispose", function () {
            var shoppingCart = new ShoppingCart;
            shoppingCart.addItem("Sneakers");
            shoppingCart.addItem("Milk");
            expect(shoppingCart.getItems()).to.eql(["Sneakers", "Milk"]);
            shoppingCart.dispose();
            expect(shoppingCart.getItems()).to.eql([]);
        });

        it("should only dispose once", function () {
            var counter = 0,
                DisposeCounter = Base.extend(Disposing, DisposingMixin, {
                _dispose: function () { ++counter; }
            });
            var disposeCounter = new DisposeCounter;
            expect(counter).to.equal(0);
            disposeCounter.dispose();
            expect(counter).to.equal(1);
            disposeCounter.dispose();
            expect(counter).to.equal(1);
        });
    });
});

describe("$using", function () {
    it("should call block then dispose", function () {
        var shoppingCart = new ShoppingCart;
        shoppingCart.addItem("Halo II");
        shoppingCart.addItem("Porsche");
        $using(shoppingCart, function (cart) {
            expect(shoppingCart.getItems()).to.eql(["Halo II", "Porsche"]);
        });
        expect(shoppingCart.getItems()).to.eql([]);
    });
    
    it("should call block then dispose if exeception", function () {
        var shoppingCart = new ShoppingCart;
        shoppingCart.addItem("Halo II");
        shoppingCart.addItem("Porsche");
        expect(function () { 
            $using(shoppingCart, function (cart) {
                throw new Error("Something bad");
            });
        }).to.throw(Error, "Something bad");
        expect(shoppingCart.getItems()).to.eql([]);
    });

    it("should wait for promise to fulfill then dispose", function (done) {
        var shoppingCart = new ShoppingCart;
        shoppingCart.addItem("Halo II");
        shoppingCart.addItem("Porsche");
        $using(shoppingCart, Promise.delay(100).then(function () {
               shoppingCart.addItem("Book");
               expect(shoppingCart.getItems()).to.eql(["Halo II", "Porsche", "Book"]);
               }) 
        ).finally(function () {
            expect(shoppingCart.getItems()).to.eql([]);
            done();
        });
    });

    it("should wait for promise fromm block to fulfill then dispose", function (done) {
        var shoppingCart = new ShoppingCart;
        shoppingCart.addItem("Halo II");
        shoppingCart.addItem("Porsche");
        $using(shoppingCart, function (cart) {
               return Promise.delay(100).then(function () {
                   shoppingCart.addItem("Book");
                   expect(shoppingCart.getItems()).to.eql(["Halo II", "Porsche", "Book"]);
               })
        }).finally(function () {
            expect(shoppingCart.getItems()).to.eql([]);
            done();
        });
    });
    
    it("should wait for promise to fail then dispose", function (done) {
        var shoppingCart = new ShoppingCart;
        shoppingCart.addItem("Halo II");
        shoppingCart.addItem("Porsche");
        $using(shoppingCart, Promise.delay(100).then(function () {
               throw new Error("Something bad");
               })
        ).catch(function (err) {
            expect(shoppingCart.getItems()).to.eql([]);
            done();
        });
    });

    it("should return block result", function () {
        var shoppingCart = new ShoppingCart;
        shoppingCart.addItem("Halo II");
        shoppingCart.addItem("Porsche");
        expect($using(shoppingCart, function (cart) {
            return "approved";
        })).to.equal("approved");
    });

    it("should return block promise result", function (done) {
        var shoppingCart = new ShoppingCart;
        shoppingCart.addItem("Halo II");
        shoppingCart.addItem("Porsche");
        $using(shoppingCart, function (cart) {
               return Promise.delay(100).then(function () {
                   return "approved";
               })
        }).then(function (result) {
            expect(result).to.equal("approved");
            done();
        });
    });
    
    it("should return dispose result if present", function () {
        var shoppingCart = (new ShoppingCart).extend({
            dispose: function () {
                this.base();
                return "rejected";
            }
        });
        shoppingCart.addItem("Halo II");
        shoppingCart.addItem("Porsche");
        expect($using(shoppingCart, function (cart) {
            return "approved";
        })).to.equal("rejected");
    });

    it("should return dispose promise result", function (done) {
        var shoppingCart = (new ShoppingCart).extend({
            dispose: function () {
                this.base();
                return Promise.resolve("rejected");
            }
        });
        shoppingCart.addItem("Halo II");
        shoppingCart.addItem("Porsche");
        $using(shoppingCart, function (cart) {
                   return "approved";
        }).then(function (result) {
            expect(result).to.equal("rejected");
            done();
        });
    });    
});

describe("$decorator", function () {
    it("should create a decorator", function () {
        var dog  = new Dog("Snuffy"),
            echo = $decorator({
                getName: function () {
                    return this.base() + ' ' + this.base();
                }
            }),
            dogEcho = echo(dog);
        expect(dogEcho.name).to.equal("Snuffy Snuffy");
    });
});

describe("$decorate", function () {
    it("should decorate an instance", function () {
        var dog     = new Dog("Sparky"),
            reverse = $decorate(dog, {
                getName: function () {
                    return this.base().split('').reverse().join('');
                }
            });
        expect(reverse.name).to.equal("ykrapS");
    });
});

describe("$decorated", function () {
    it("should return nearest decorated instance", function () {
        var dog        = new Dog("Brutus"),
            decorator  = $decorate(dog),
            decorator2 = $decorate(decorator);
        expect($decorated(decorator)).to.equal(dog);
        expect($decorated(decorator2)).to.equal(decorator);
    });

    it("should return deepest decorated instance", function () {
        var dog       = new Dog("Brutus"),
            decorator = $decorate($decorate(dog));
        expect($decorated(decorator, true)).to.equal(dog);
    });

});

describe("Modifier", function () {
    describe("$createModifier", function () {
        it("should create a new modifier", function () {
            var wrap    = $createModifier('wrap');
        expect(wrap.prototype).to.be.instanceOf(Modifier);
        });

        it("should apply a  modifier using function call", function () {
            var wrap    = $createModifier('wrap'),
                wrapped = wrap(22);
            expect(wrap.test(wrapped)).to.be.true;
            expect(wrapped.getSource()).to.equal(22);
        });
        
        it("should not apply a modifier the using new operator", function () {
            var wrap    = $createModifier('wrap');
            expect(function () { 
                new wrap(22);
            }).to.throw(Error, /Modifiers should not be called with the new operator./);
        });
        
        it("should ignore modifier if already present", function () {
            var wrap    = $createModifier('wrap'),
                wrapped = wrap(wrap("soccer"));
            expect(wrapped.getSource()).to.equal("soccer");
        });
    })

    describe("#test", function () {
        it("should test chained modifiers", function () {
            var shape = $createModifier('shape'),
                wrap  = $createModifier('wrap'),
                roll  = $createModifier('roll'),
                chain = shape(wrap(roll(19)));
            expect(shape.test(chain)).to.be.true;
            expect(wrap.test(chain)).to.be.true;
            expect(roll.test(chain)).to.be.true;
        });
    });

    describe("#unwrap", function () {
        it("should unwrap source when modifiers chained", function () {
            var shape = $createModifier('shape'),
                wrap  = $createModifier('wrap'),
                roll  = $createModifier('roll'),
                chain = shape(wrap(roll(19)));
            expect(Modifier.unwrap(chain)).to.equal(19);
        });
    });
});

describe("Protocol", function () {
    it("should proxy calls to normal objects", function () {
        var dog = Animal(new Dog);
        expect(dog.talk()).to.equal('Ruff Ruff');
    });
    
    it("should ignore null or undefined target", function () {
        Animal().talk();
        Animal(null).talk();
    });
    
    it("should ignore missing methods", function () {
        var dog = Animal(new Dog);
        dog.eat('bug');
    });
    
    it("should support specialization", function () {
        expect(CircusAnimal(new Dog).fetch("bone")).to.equal('Fetched bone');
    });
    
    it("should ignore if strict and protocol not adopted", function () {
        var Toy = Base.extend({
            talk: function () { return 'To infinity and beyond'; }
        });
        expect(Animal(new Toy).talk()).to.equal('To infinity and beyond');
        expect(Animal(new Toy, true).talk()).to.be.undefined;
    });
    
    describe("#isProtocol", function () {
        it("should determine if type is a protocol", function () {
            expect(Protocol.isProtocol(Animal)).to.be.true;
            expect(Protocol.isProtocol(CircusAnimal)).to.be.true;
            expect(Protocol.isProtocol(Dog)).to.be.false;
            expect(Protocol.isProtocol(AsianElephant)).be.false;
        });

        it("should not consider Protocol a protocol", function () {
            expect(Protocol.isProtocol(Protocol)).to.be.false;
        });
    });

    describe("#getProtocols", function () {
        it("should retrieve declaring protocols", function () {
            expect(Dog.$meta.getProtocols()).to.eql([Animal, Tricks]);
        });
    });

    describe("#getAllProtocols", function () {
        it("should retrieve all protocol protocols", function () {
            expect(CircusAnimal.$meta.getAllProtocols()).to.eql([Animal, Tricks]);
        });

        it("should retrieve all class protocols", function () {
            expect(AsianElephant.$meta.getAllProtocols()).to.eql([Tracked, CircusAnimal, Animal, Tricks]);
        });
    });

    describe("#implement", function () {
        it("should extend protocol", function () {
            Animal.implement({
               reproduce: function () {}
            });
            var dog = new Dog;
            expect(Animal(dog).reproduce()).to.be.undefined;
            dog.extend({
                reproduce: function () {
                    return new Dog('Hazel');
                }
            });
            expect(Animal(dog).reproduce().getName()).to.equal('Hazel');
        });
    });

    describe("#conformsTo", function () {
        it("should conform to protocols by class", function () {
            expect(Dog.conformsTo()).to.be.false;
			expect(Dog.conformsTo(Animal)).to.be.true;
		    expect(Dog.conformsTo(Tricks)).to.be.true;
        });

        it("should conform to protocols by protocol", function () {
            expect(CircusAnimal.conformsTo(Animal)).to.be.true;
            expect(CircusAnimal.conformsTo(Tricks)).to.be.true;
            expect(Animal.conformsTo(Tricks)).to.be.false;
            expect(CircusAnimal.conformsTo(CircusAnimal)).to.be.true;
        });

        it("should conform to protocols by object", function () {
            var dog = new Dog;
            expect(dog.conformsTo(Animal)).to.be.true;
            expect(dog.conformsTo(Tricks)).to.be.true;
        });

        it("should only list protocol once", function () {
            var Cat = Base.extend(Animal, Animal);
            expect(Cat.conformsTo(Animal)).to.be.true;
            expect(Cat.$meta.getProtocols()).to.eql([Animal]);
        });

        it("should only list protocol once if extended", function () {
            var Cat = Animal.extend(Animal);
            expect(Cat.conformsTo(Animal)).to.be.true;
            expect(Cat.$meta.getProtocols()).to.eql([Animal]);
        });

        it("should support protocol inheritance", function () {
            expect(Elephant.conformsTo(Animal)).to.be.true;
            expect(CircusAnimal.$meta.getProtocols()).to.eql([Animal, Tricks]);
        });

        it("should inherit protocol conformance", function () {
            expect(AsianElephant.conformsTo(Animal)).to.be.true;
            expect(AsianElephant.conformsTo(Tricks)).to.be.true;
        });

        it("should accept array of protocols", function () {
            var EndangeredAnimal = Base.extend([Animal, Tracked]);
            expect(EndangeredAnimal.conformsTo(Animal)).to.be.true;
            expect(EndangeredAnimal.conformsTo(Tracked)).to.be.true;
            expect(EndangeredAnimal.$meta.getProtocols()).to.eql([Animal, Tracked]);
        });

        it("should allow redefining method", function () {
            var SmartTricks = Tricks.extend({
                    fetch: function (item) {}
                }),
                SmartDog = Dog.extend({
                    fetch: function (item) { return 'Buried ' + item; }
                }),
                dog = new SmartDog;
            expect(SmartTricks(dog).fetch('bone')).to.equal('Buried bone');
        });

        it("should support strict when redefing method", function () {
            var SmartTricks = Tricks.extend({
                    constructor: function (proxy) {
                        this.base(proxy, true);
                    },
                    fetch: function (item) {}
                }),
                SmartDog = Dog.extend({
                    fetch: function (item) { return 'Buried ' + item; }
                }),
                dog = new SmartDog;
            expect(Tricks(dog).fetch('bone')).to.equal('Buried bone');
            expect(SmartTricks(dog).fetch('bone')).to.be.undefined;
        });
    });

    describe("#adoptedBy", function () {
        it("should determine if protocol adopted by class", function () {
            expect(Animal.adoptedBy(Dog)).to.be.true;
        });

        it("should determine if protocol adopted by protocol", function () {
                var i = 0;
            expect(Protocol.adoptedBy(Animal)).to.be.false;
            expect(Tricks.adoptedBy(Animal)).to.be.false;
            expect(Animal.adoptedBy(CircusAnimal)).to.be.true;
        });

        it("should determine if protocol adopted by object", function () {
            expect(Animal.adoptedBy(new Dog)).to.be.true;
        });
    });

    describe("#addProtocol", function () {
        it("should add protocol to class", function () {
            var Bird  = Base.extend(Animal),
                eagle = (new Bird).extend({
                   getTag : function () { return "Eagle"; }
				});
            Bird.$meta.addProtocol(Tracked);
            expect(Bird.conformsTo(Tracked)).to.be.true;
			expect(eagle.getTag()).to.equal("Eagle");
        });

        it("should add protocol to protocol", function () {
            var Bear      = Base.extend(Animal),
                polarBear = (new Bear).extend({
                getTag : function () { return "Polar Bear"; }
            });
			Animal.$meta.addProtocol(Tracked);
            expect(polarBear.conformsTo(Tracked)).to.be.true;
			expect(polarBear.getTag()).to.equal("Polar Bear");
			expect(Animal(polarBear).getTag()).to.equal("Polar Bear");
        });
    })

    describe("#delegate", function () {
        it("should delegate invocations to object", function () {
            var dog = new Dog('Fluffy');
            expect(Animal(dog).talk()).to.equal('Ruff Ruff');
        });

        it("should delegate invocations to array", function () {
            var count = 0,
                Dog2  = Dog.extend({
                    talk: function () {
                        ++count;
                        return this.base();
                    }
                }),
                dogs = [new Dog2('Fluffy'), new Dog2('Max')];
            expect(Animal(dogs).talk()).to.equal('Ruff Ruff');
            expect(count).to.equal(2);
        });        
    });

    describe("#delegateGet", function () {
        it("should delegate property gets to object", function () {
            var dog  = new Dog('Franky');
            expect(Animal(dog).name).to.equal('Franky');
            expect(CircusAnimal(dog).name).to.equal('Franky');
        });

        it("should delegate property gets to array", function () {
            var count = 0,
                Dog2  = Dog.extend({
                    constructor: function (name) {
                        this.base(name);
                        this.extend({
                            getName: function () {
                                ++count;
                                return this.base();
                            }
                        });
                    }
                }),            
                dogs = [new Dog2('Franky'), new Dog2('Spot')];
            expect(Animal(dogs).name).to.equal('Spot');
            expect(count).to.equal(2);
        });        
    });

    describe("#delegateSet", function () {
        it("should delegate property sets to object", function () {
            var dog = new Dog('Franky');
            Animal(dog).name = 'Ralphy';
            expect(dog.name).to.equal('Ralphy');
        });

        it("should delegate property sets to array", function () {
            var count = 0,
                Dog2  = Dog.extend({
                    constructor: function (name) {
                        this.base(name);
                        this.extend({
                            getName: function () {
                                ++count;
                                return this.base();
                            }
                        });
                    }
                }),
                dogs = [new Dog2('Franky'), new Dog2('Pebbles')];
            Animal(dogs).name = 'Ralphy';
            expect(dogs[0].name).to.equal('Ralphy');
            expect(dogs[1].name).to.equal('Ralphy');
            expect(count).to.equal(2);            
        });
        
        it("should delegate extended property sets", function () {
            var dog  = new Dog('Franky');
            Animal.implement({
                $properties: {
                    nickname: undefined
                }
            });
            dog.extend({
                $properties: {
                    nickname: ''
                }
            });
            Animal(dog).nickname = 'HotDog';
            expect(dog.nickname).to.equal('HotDog');
        });
    });
});

describe("ProxyBuilder", function () {
    var ToUpperInterceptor = Interceptor.extend({
        intercept: function (invocation) {
            var args = invocation.args;
            for (var i = 0; i < args.length; ++i) {
                if ($isString(args[i])) {
                    args[i] = args[i].toUpperCase();
                }
            }
            var result = invocation.proceed();
            if ($isString(result)) {
                result = result.toUpperCase();
            }
            return result;
        }
    });
        
    describe("#buildProxy", function () {
        it("should proxy class", function () {
            var proxyBuilder = new ProxyBuilder,
                DogProxy     = proxyBuilder.buildProxy([Dog]),
                dog          = new DogProxy({
                                   parameters:   ['Patches'],
                                   interceptors: [new LogInterceptor]
                });
            expect(dog.name).to.equal('Patches');
            expect(dog.getName()).to.equal('Patches');
            expect(dog.talk()).to.equal('Ruff Ruff');
            expect(dog.fetch("bone")).to.equal('Fetched bone');
        });

        it("should proxy protocol", function () {
            var proxyBuilder = new ProxyBuilder,
                AnimalProxy  = proxyBuilder.buildProxy([Animal]),
                AnimalInterceptor = Interceptor.extend({
                    name : '',
                    intercept: function (invocation) {
                        var method = invocation.method,
                            args   = invocation.args;
                        if (method === "getName") {
                            return this.name;
                        } else if (method === 'setName') {
                            return (this.name = args[0]);
                        } else if (method === "talk") {
                            return "I don't know what to say.";
                        } else if (method === "eat") {
                            return lang.format("I don't like %1.", args[0]);
                        }
                        return invocation.proceed();
                    }
                }),
                animal = new AnimalProxy({
                    interceptors: [new AnimalInterceptor]
                });
            animal.name = "Pluto";
            expect(animal.name).to.equal("Pluto");
            expect(animal.talk()).to.equal("I don't know what to say.");
            expect(animal.eat('pizza')).to.equal("I don't like pizza.");
        });

        it("should proxy classes and protocols", function () {
            var proxyBuilder   = new ProxyBuilder,
                Flying         = Protocol.extend({ fly: function () {} }),
                FlyingInterceptor = Interceptor.extend({
                    intercept: function (invocation) {
                        if (invocation.method !== 'fly') {
                            return invocation.proceed();
                        }
                    }
                }),
                FlyingDogProxy = proxyBuilder.buildProxy([Dog, Flying, DisposingMixin]);
            $using(new FlyingDogProxy({
                       parameters:   ['Wonder Dog'],
                       interceptors: [new FlyingInterceptor, new LogInterceptor]
                   }), function (wonderDog) {
                expect(wonderDog.getName()).to.equal('Wonder Dog');
                expect(wonderDog.talk()).to.equal('Ruff Ruff');
                expect(wonderDog.fetch("purse")).to.equal('Fetched purse');
                wonderDog.fly();
                }
            );
        });

        it("should modify arguments and return value", function () {
            var proxyBuilder = new ProxyBuilder,
                DogProxy     = proxyBuilder.buildProxy([Dog]),
                dog          = new DogProxy({
                                   parameters:   ['Patches'],
                                   interceptors: [new ToUpperInterceptor]
                               });
            expect(dog.getName()).to.equal('PATCHES');
            expect(dog.talk()).to.equal('RUFF RUFF');
            expect(dog.fetch("bone")).to.equal('FETCHED BONE');
        });

        it("should restrict proxied method with interceptor selector options", function () {
            var proxyBuilder = new ProxyBuilder,
                selector     =  (new InterceptorSelector).extend({
                    selectInterceptors: function (type, method, interceptors) {
                        return method === 'getName' ? interceptors : [];
                }}),
                DogProxy     = proxyBuilder.buildProxy([Dog]),
                dog          = new DogProxy({
                                   parameters:           ['Patches'],
                                   interceptors:         [new ToUpperInterceptor],
                                   interceptorSelectors: [selector]
                               });
            expect(dog.getName()).to.equal('PATCHES');
            expect(dog.talk()).to.equal('Ruff Ruff');
            expect(dog.fetch("bone")).to.equal('Fetched bone');
        });

        it("should fail if no types array provided", function () {
            var proxyBuilder = new ProxyBuilder;
            expect(function () {
                proxyBuilder.buildProxy();
            }).to.throw(Error, "ProxyBuilder requires an array of types to proxy.");
        });

        it("should fail if no method to proceed too", function () {
            var proxyBuilder = new ProxyBuilder,
                AnimalProxy  = proxyBuilder.buildProxy([Animal]),
                animal       = new AnimalProxy([]);
            expect(function () {
                animal.talk();
            }).to.throw(Error, "Interceptor cannot proceed without a class or delegate method 'talk'.");
        });
    });

    describe("#extend", function () {
        it("should reject extending  proxy classes.", function () {
            var proxyBuilder = new ProxyBuilder,
                DogProxy     = proxyBuilder.buildProxy([Dog]);
            expect(function () {
                DogProxy.extend();
            }).to.throw(TypeError, "Proxy classes are sealed and cannot be extended from.");
        });

        it("should proxy new method", function () {
            var proxyBuilder = new ProxyBuilder,
                DogProxy     = proxyBuilder.buildProxy([Dog]),
                dog          = new DogProxy({
                                  parameters:  ['Patches'],
                                  interceptors:[new ToUpperInterceptor]
                               });
            dog.extend("getColor", function () { return "white with brown spots"; });
            dog.extend({
                getBreed: function () { return "King James Cavalier"; }
            });
            expect(dog.getColor()).to.equal("WHITE WITH BROWN SPOTS");
            expect(dog.getBreed()).to.equal("KING JAMES CAVALIER");
        });

        it("should proxy existing methods", function () {
            var proxyBuilder = new ProxyBuilder,
                DogProxy     = proxyBuilder.buildProxy([Dog]),
                dog          = new DogProxy({
                                  parameters:  ['Patches'],
                                  interceptors:[new ToUpperInterceptor]
                               });
            expect(dog.getName()).to.equal("PATCHES");
            dog.extend({
                getName: function () { return "Spike"; }
            });
            expect(dog.getName()).to.equal("SPIKE");
        });
    });

    describe("#implement", function () {
        it("should reject extending  proxy classes.", function () {
            var proxyBuilder = new ProxyBuilder,
                DogProxy     = proxyBuilder.buildProxy([Dog]);
            expect(function () {
                DogProxy.implement(DisposingMixin);
            }).to.throw(TypeError, "Proxy classes are sealed and cannot be extended from.");
        });
    });
});

describe("Package", function () {
    describe("#version", function () {
        it("should inherit parent version", function () {
            var foo = base2.package(this, {
                name:    "foo",
                version: "1.0.0"
            });
            var bar = foo.package(this, {
                name:    "bar",
            });
            var baz = bar.package(this, {
                name:    "baz",
                version: "2.0.0"
            });            
            expect(bar.version).to.equal("1.0.0");
            expect(baz.version).to.equal("2.0.0");
        });        
    });
    
    describe("#getProtocols", function () {
        it("should expose protocol definitions", function () {
            var protocols = [];
            miruken_test.getProtocols(function (protocol) {
                protocols.push(protocol.member);
            });
            expect(protocols).to.have.members([Animal, Tricks, CircusAnimal, Tracked]);
        });

        it("should expose filtered protocol definitions", function () {
            var protocols = [];
            miruken_test.getProtocols(["Tricks", "Tracked"], function (protocol) {
                protocols.push(protocol.member);
            });
            expect(protocols).to.have.members([Tricks, Tracked]);
        });
    });

    describe("#getClasses", function () {
        it("should expose class definitions", function () {
            var classes = [];
            miruken_test.getClasses(function (cls) {
                classes.push(cls.member);
            });
            expect(classes).to.have.members([Dog, Elephant, AsianElephant, ShoppingCart, LogInterceptor]);
        });

        it("should expose filtered class definitions", function () {
            var classes = [];
            miruken_test.getClasses(["Elephant", "AsianElephant"], function (cls) {
                classes.push(cls.member);
            });
            expect(classes).to.have.length(2);
            expect(classes).to.have.members([Elephant, AsianElephant]);
        });        
    });

    describe("#getPackages", function () {
        it("should expose package definitions", function () {
            var packages = [];
            base2.getPackages(function (package) {
                packages.push(package.member);
            });
            expect(packages).to.contain(miruken_test);
        });

        it("should expose filterd package definitions", function () {
            var packages = [];
            base2.getPackages("foo", function (package) {
                packages.push(package.member);
            });
            expect(packages).to.have.length(0);
        });
        
    });
});
