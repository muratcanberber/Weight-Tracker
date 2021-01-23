
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.31.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.31.2 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    // (54:3) {#if weightLossPerADay > 0 }
    function create_if_block(ctx) {
    	const block = { c: noop, m: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(54:3) {#if weightLossPerADay > 0 }",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div0;
    	let span0;
    	let t1;
    	let div5;
    	let div1;
    	let label0;
    	let t3;
    	let input0;
    	let t4;
    	let div2;
    	let label1;
    	let t6;
    	let input1;
    	let t7;
    	let div3;
    	let label2;
    	let t9;
    	let input2;
    	let br;
    	let t10;
    	let div4;
    	let t11;
    	let div6;
    	let button;
    	let t13;
    	let div7;
    	let span1;
    	let t15;
    	let div9;
    	let t16;
    	let div8;
    	let span2;
    	let t17;
    	let t18;
    	let t19;
    	let span3;
    	let t20;
    	let t21;
    	let t22;
    	let link;
    	let script;
    	let script_src_value;
    	let mounted;
    	let dispose;
    	let if_block = /*weightLossPerADay*/ ctx[3] > 0 && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "Weight Tracker";
    			t1 = space();
    			div5 = element("div");
    			div1 = element("div");
    			label0 = element("label");
    			label0.textContent = "Enter Your Current Weight";
    			t3 = space();
    			input0 = element("input");
    			t4 = space();
    			div2 = element("div");
    			label1 = element("label");
    			label1.textContent = "Enter Your Target Weight";
    			t6 = space();
    			input1 = element("input");
    			t7 = space();
    			div3 = element("div");
    			label2 = element("label");
    			label2.textContent = "Set A Goal Date !";
    			t9 = space();
    			input2 = element("input");
    			br = element("br");
    			t10 = space();
    			div4 = element("div");
    			t11 = space();
    			div6 = element("div");
    			button = element("button");
    			button.textContent = "Calculate";
    			t13 = space();
    			div7 = element("div");
    			span1 = element("span");
    			span1.textContent = "To Reach Your Goals You Must Loose Weight :";
    			t15 = space();
    			div9 = element("div");
    			if (if_block) if_block.c();
    			t16 = space();
    			div8 = element("div");
    			span2 = element("span");
    			t17 = text(/*weightLossPerADay*/ ctx[3]);
    			t18 = text(" / day");
    			t19 = space();
    			span3 = element("span");
    			t20 = text(/*weightLossPerAWeek*/ ctx[4]);
    			t21 = text(" / week");
    			t22 = space();
    			link = element("link");
    			script = element("script");
    			attr_dev(span0, "class", "is-size-1");
    			add_location(span0, file, 28, 4, 635);
    			attr_dev(div0, "class", "title svelte-180dx9b");
    			add_location(div0, file, 27, 2, 611);
    			attr_dev(label0, "for", "weight");
    			add_location(label0, file, 32, 6, 747);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "label", "weight");
    			add_location(input0, file, 33, 6, 807);
    			attr_dev(div1, "class", "form-items svelte-180dx9b");
    			add_location(div1, file, 31, 4, 715);
    			attr_dev(label1, "for", "weight");
    			add_location(label1, file, 36, 6, 919);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "label", "weight");
    			add_location(input1, file, 37, 6, 978);
    			attr_dev(div2, "class", "form-items svelte-180dx9b");
    			add_location(div2, file, 35, 4, 888);
    			attr_dev(label2, "for", "birthdaytime");
    			add_location(label2, file, 40, 6, 1089);
    			attr_dev(input2, "type", "date");
    			attr_dev(input2, "name", "birthdaytime");
    			add_location(input2, file, 41, 6, 1148);
    			add_location(br, file, 41, 69, 1211);
    			attr_dev(div3, "class", "form-items svelte-180dx9b");
    			add_location(div3, file, 39, 4, 1058);
    			add_location(div4, file, 43, 1, 1230);
    			attr_dev(div5, "class", "form svelte-180dx9b");
    			add_location(div5, file, 30, 2, 692);
    			attr_dev(button, "class", "button is-primary");
    			add_location(button, file, 47, 1, 1279);
    			attr_dev(div6, "class", "calculateBtn svelte-180dx9b");
    			add_location(div6, file, 46, 2, 1251);
    			attr_dev(span1, "class", "is-size-1");
    			add_location(span1, file, 50, 4, 1404);
    			attr_dev(div7, "class", "bottom svelte-180dx9b");
    			add_location(div7, file, 49, 2, 1379);
    			attr_dev(span2, "class", "box1 svelte-180dx9b");
    			add_location(span2, file, 55, 6, 1564);
    			attr_dev(span3, "class", "box2 svelte-180dx9b");
    			add_location(span3, file, 56, 6, 1623);
    			attr_dev(div8, "class", "cards svelte-180dx9b");
    			add_location(div8, file, 54, 4, 1538);
    			add_location(div9, file, 52, 2, 1490);
    			add_location(main, file, 26, 0, 602);
    			attr_dev(link, "rel", "stylesheet");
    			attr_dev(link, "type", "text/css");
    			attr_dev(link, "href", "https://cdn.jsdelivr.net/npm/bulma@0.8.0/css/bulma.min.css");
    			add_location(link, file, 63, 2, 1721);
    			if (script.src !== (script_src_value = "https://use.fontawesome.com/releases/v5.3.1/js/all.js")) attr_dev(script, "src", script_src_value);
    			add_location(script, file, 67, 4, 1842);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div0);
    			append_dev(div0, span0);
    			append_dev(main, t1);
    			append_dev(main, div5);
    			append_dev(div5, div1);
    			append_dev(div1, label0);
    			append_dev(div1, t3);
    			append_dev(div1, input0);
    			set_input_value(input0, /*currentWeight*/ ctx[0]);
    			append_dev(div5, t4);
    			append_dev(div5, div2);
    			append_dev(div2, label1);
    			append_dev(div2, t6);
    			append_dev(div2, input1);
    			set_input_value(input1, /*targetWeight*/ ctx[1]);
    			append_dev(div5, t7);
    			append_dev(div5, div3);
    			append_dev(div3, label2);
    			append_dev(div3, t9);
    			append_dev(div3, input2);
    			set_input_value(input2, /*goalDate*/ ctx[2]);
    			append_dev(div3, br);
    			append_dev(div5, t10);
    			append_dev(div5, div4);
    			append_dev(main, t11);
    			append_dev(main, div6);
    			append_dev(div6, button);
    			append_dev(main, t13);
    			append_dev(main, div7);
    			append_dev(div7, span1);
    			append_dev(main, t15);
    			append_dev(main, div9);
    			if (if_block) if_block.m(div9, null);
    			append_dev(div9, t16);
    			append_dev(div9, div8);
    			append_dev(div8, span2);
    			append_dev(span2, t17);
    			append_dev(span2, t18);
    			append_dev(div8, t19);
    			append_dev(div8, span3);
    			append_dev(span3, t20);
    			append_dev(span3, t21);
    			insert_dev(target, t22, anchor);
    			append_dev(document.head, link);
    			append_dev(document.head, script);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[6]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[7]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[8]),
    					listen_dev(button, "click", /*calcualteWeightLossPerDay*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*currentWeight*/ 1 && to_number(input0.value) !== /*currentWeight*/ ctx[0]) {
    				set_input_value(input0, /*currentWeight*/ ctx[0]);
    			}

    			if (dirty & /*targetWeight*/ 2 && to_number(input1.value) !== /*targetWeight*/ ctx[1]) {
    				set_input_value(input1, /*targetWeight*/ ctx[1]);
    			}

    			if (dirty & /*goalDate*/ 4) {
    				set_input_value(input2, /*goalDate*/ ctx[2]);
    			}

    			if (/*weightLossPerADay*/ ctx[3] > 0) {
    				if (if_block) ; else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div9, t16);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*weightLossPerADay*/ 8) set_data_dev(t17, /*weightLossPerADay*/ ctx[3]);
    			if (dirty & /*weightLossPerAWeek*/ 16) set_data_dev(t20, /*weightLossPerAWeek*/ ctx[4]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block) if_block.d();
    			if (detaching) detach_dev(t22);
    			detach_dev(link);
    			detach_dev(script);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let currentWeight;
    	let targetWeight;
    	let goalDate;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let dayLeft = 0;
    	let weightLossPerADay = 0;
    	let weightLossPerAWeek = 0;

    	const calcualteWeightLossPerDay = () => {
    		let currentDate = new Date();
    		let diff = new Date(goalDate) - currentDate; //ms
    		dayLeft = diff / 84000000;
    		$$invalidate(3, weightLossPerADay = ((currentWeight - targetWeight) / dayLeft).toFixed(2));
    		$$invalidate(4, weightLossPerAWeek = ((currentWeight - targetWeight) / dayLeft * 7).toFixed(2));
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		currentWeight = to_number(this.value);
    		$$invalidate(0, currentWeight);
    	}

    	function input1_input_handler() {
    		targetWeight = to_number(this.value);
    		$$invalidate(1, targetWeight);
    	}

    	function input2_input_handler() {
    		goalDate = this.value;
    		$$invalidate(2, goalDate);
    	}

    	$$self.$capture_state = () => ({
    		dayLeft,
    		weightLossPerADay,
    		weightLossPerAWeek,
    		calcualteWeightLossPerDay,
    		currentWeight,
    		targetWeight,
    		goalDate
    	});

    	$$self.$inject_state = $$props => {
    		if ("dayLeft" in $$props) dayLeft = $$props.dayLeft;
    		if ("weightLossPerADay" in $$props) $$invalidate(3, weightLossPerADay = $$props.weightLossPerADay);
    		if ("weightLossPerAWeek" in $$props) $$invalidate(4, weightLossPerAWeek = $$props.weightLossPerAWeek);
    		if ("currentWeight" in $$props) $$invalidate(0, currentWeight = $$props.currentWeight);
    		if ("targetWeight" in $$props) $$invalidate(1, targetWeight = $$props.targetWeight);
    		if ("goalDate" in $$props) $$invalidate(2, goalDate = $$props.goalDate);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*currentWeight, targetWeight, goalDate*/ 7) {
    			 console.log({ currentWeight, targetWeight, goalDate });
    		}
    	};

    	 $$invalidate(0, currentWeight = 0);
    	 $$invalidate(1, targetWeight = 0);
    	 $$invalidate(2, goalDate = new Date());

    	return [
    		currentWeight,
    		targetWeight,
    		goalDate,
    		weightLossPerADay,
    		weightLossPerAWeek,
    		calcualteWeightLossPerDay,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
