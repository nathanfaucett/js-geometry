var tape = require("tape"),
    Geometry = require("..");


var position = [-0.5, 0.5,
    0.5, 0.5, -0.5, -0.5,
    0.5, -0.5
];
var uv = [
    0, 1,
    1, 1,
    0, 0,
    1, 0
];


tape("geometry", function(assert) {
    var geometry = Geometry.create({
        name: "geometry",
        src: null
    });

    geometry.addAttribute("position", 8, 2, Float32Array, false, position);
    geometry.addAttribute("uv", 8, 2, Float32Array, false, uv);

    assert.deepEquals(geometry.getAttribute("position").array, position);
    assert.deepEquals(geometry.getAttribute("uv").array, uv);

    assert.end();
});