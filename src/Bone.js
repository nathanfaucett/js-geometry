var vec3 = require("@nathanfaucett/vec3"),
    quat = require("@nathanfaucett/quat"),
    mat4 = require("@nathanfaucett/mat4"),
    isNullOrUndefined = require("@nathanfaucett/is_null_or_undefined");


var UNKNOWN_BONE_COUNT = 1,
    GeometryBonePrototype;


module.exports = GeometryBone;


function GeometryBone() {
    this.parentIndex = null;
    this.name = null;

    this.skinned = null;
    this.position = vec3.create();
    this.rotation = quat.create();
    this.scale = vec3.create(1, 1, 1);
    this.bindPose = mat4.create();
}
GeometryBonePrototype = GeometryBone.prototype;

GeometryBone.create = function(parentIndex, name) {
    return (new GeometryBone()).construct(parentIndex, name);
};

GeometryBonePrototype.construct = function(parentIndex, name) {

    this.parentIndex = isNullOrUndefined(parentIndex) ? -1 : parentIndex;
    this.name = isNullOrUndefined(name) ? "GeometryBone" + UNKNOWN_BONE_COUNT++ : name;
    this.skinned = false;

    return this;
};

GeometryBonePrototype.destructor = function() {

    this.parentIndex = null;
    this.name = null;

    this.skinned = null;
    vec3.set(this.position, 0, 0, 0);
    quat.set(this.rotation, 0, 0, 0, 1);
    vec3.set(this.scale, 1, 1, 1);
    mat4.identity(this.bindPose);

    return this;
};