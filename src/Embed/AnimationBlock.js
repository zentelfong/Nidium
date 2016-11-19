/* -------------------------------------------------------------------------- */
/* MIT license                                          (c) 2016 Nidium, Inc. */
/* -------------------------------------------------------------------------- */
/* Permission is hereby granted, free of charge, to any person obtaining a    */
/* copy of this software and associated documentation files (the "Software"), */
/* to deal in the Software without restriction, including without limitation  */
/* the rights to use, copy, modify, merge, publish, distribute, sublicense,   */
/* and/or sell copies of the Software, and to permit persons to whom the      */
/* Software is furnished to do so, subject to the following conditions:       */
/*                                                                            */
/* The above copyright notice and this permission notice shall be included in */
/* all copies or substantial portions of the Software.                        */
/*                                                                            */
/* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR */
/* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,   */
/* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL    */
/* THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER */
/* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING    */
/* FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER        */
/* DEALINGS IN THE SOFTWARE.                                                  */
/* -------------------------------------------------------------------------- */


/*
    AnimationBlock provides a way to easily create animation is a declarative way

    Example on animating properties for my_obj and my_obj2 :

        AnimationBlock(2000, Easing.Bounce.Out, (my_obj, my_obj2) => {
            my_obj.left = 200;
            my_obj.top = 50;
            my_obj2.opacity = 0.2;
            my_obj2.left = my_obj.left;
        }, my_obj, my_obj2)(() => {
            console.log("Animation ended");
        });

    Example on animating properties on a list of objects (array(lst))

        AnimationBlock(2000, Easing.Bounce.Out, (...lst) => {
            for (let o of lst) {
                o.left = Math.random()*600;
                o.top = Math.random()*500;
            }
        }, ...lst)(() => {
            console.log("Animation ended");
        });
*/

var Easing = require("easing");

var AnimationsList = new Set();

{
    let draw = function() {
        let curDate = +new Date();

        for (let anim of AnimationsList) {
            let { end, start, ease, list, duration } = anim;
            let e = ease((curDate - start) / (end - start));
            let finish = (curDate > end);

            for (let elem of list) {
                let { target, property, value, startValue } = elem;
                target[property] = finish ? value : startValue + ((value - startValue) * e);                
            }

            if (finish) {
                if (anim.next) {
                    anim.redo(anim.next);
                } else {
                    anim.finish();
                    AnimationsList.delete(anim);
                }
            }
        }

        window.requestAnimationFrame(draw);
    }

    draw();
}

var AnimationBlock = function(duration, ease, callback, ...objs)
{
    let proxies = [];

    var anim = {
        duration,
        ease,
        objs,
        finish: function(){},
    };

    AnimationsList.add(anim);

    for (let obj of objs) {
        let proxy = new Proxy(obj, {
            set: (target, property, value, rcv) => {
                if (!(property in target)) {
                    // TODO: Check numeric
                    return true;
                }

                anim.list.push({
                    startValue: target[property],
                    target,
                    property,
                    value,                 
                })
                
                return true;
            },

            get: (target, prop, rcv) => {
                return target[prop];
            }
        });

        proxies.push(proxy);
    }

    (anim.redo = function(callback) {
        let start = +new Date();
        
        Object.assign(anim, {start, end: start+duration, list: [], next: null});

        let next = callback(...proxies);
        if (typeof next == 'function') {
            anim.next = next;
        }

    })(callback);

    return function(animationFinished) {
        anim.finish = animationFinished;
    }
}