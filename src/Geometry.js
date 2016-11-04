var vec3 = require("@nathanfaucett/vec3"),
    quat = require("@nathanfaucett/quat"),
    mat4 = require("@nathanfaucett/mat4"),
    mathf = require("@nathanfaucett/mathf"),
    aabb3 = require("@nathanfaucett/aabb3"),
    FastHash = require("@nathanfaucett/fast_hash"),
    isNullOrUndefined = require("@nathanfaucett/is_null_or_undefined"),
    assets = require("@nathanfaucett/assets"),
    Attribute = require("./Attribute"),
    Bone = require("./Bone");


var JSONAsset = assets.JSONAsset,
    JSONAssetPrototype = JSONAsset.prototype,

    NativeFloat32Array = typeof(Float32Array) !== "undefined" ? Float32Array : Array,
    NativeUint16Array = typeof(Uint16Array) !== "undefined" ? Uint16Array : Array,

    GeometryPrototype;


module.exports = Geometry;


function Geometry() {

    JSONAsset.call(this);

    this.index = null;
    this.bones = [];

    this.attributes = new FastHash("name");
    this.aabb = aabb3.create();

    this.boundingCenter = vec3.create();
    this.boundingRadius = 0;

    this.boneWeightCount = 3;
}
JSONAsset.extend(Geometry, "geometry.Geometry");
GeometryPrototype = Geometry.prototype;

GeometryPrototype.destructor = function() {

    JSONAssetPrototype.destructor.call(this);

    this.index = null;
    this.bones.length = 0;

    this.attributes.clear();
    aabb3.clear(this.aabb);

    vec3.set(this.boundingCenter, 0, 0, 0);
    this.boundingRadius = 0;

    return this;
};

GeometryPrototype.hasAttribute = function(name) {
    return this.attributes.has(name);
};

GeometryPrototype.getAttribute = function(name) {
    return this.attributes.get(name);
};

GeometryPrototype.addAttribute = function(name, length, itemSize, ArrayType, dynamic, items) {
    this.attributes.add(Attribute.create(name, length, itemSize, ArrayType, dynamic, items));
    return this;
};

GeometryPrototype.removeAttribute = function(name) {
    this.attributes.remove(name);
    return this;
};

GeometryPrototype.setIndex = function(index) {
    this.index = index;
    return this;
};

GeometryPrototype.parse = function(data) {
    var dataBones = data.bones,
        bones = this.bones,
        noIndices = false,
        items, i, il, bone, dataBone;

    if ((items = (data.index || data.indices || data.faces)) && items.length) {
        this.index = new NativeUint16Array(items);
    } else {
        noIndices = true;
    }

    if (data.boneWeightCount) {
        this.boneWeightCount = data.boneWeightCount;
    } else {
        data.boneWeightCount = 3;
    }

    if ((items = (data.position || data.vertices)) && items.length) {
        this.addAttribute("position", items.length, 3, NativeFloat32Array, false, items);
    }
    if ((items = (data.normal || data.normals)) && items.length) {
        this.addAttribute("normal", items.length, 3, NativeFloat32Array, false, items);
    }
    if ((items = (data.tangent || data.tangents)) && items.length) {
        this.addAttribute("tangent", items.length, 4, NativeFloat32Array, false, items);
    }
    if ((items = (data.color || data.colors)) && items.length) {
        this.addAttribute("color", items.length, 3, NativeFloat32Array, false, items);
    }
    if ((items = (data.uv || data.uvs)) && items.length) {
        this.addAttribute("uv", items.length, 2, NativeFloat32Array, false, items);
    }
    if ((items = (data.uv2 || data.uvs2)) && items.length) {
        this.addAttribute("uv2", items.length, 2, NativeFloat32Array, false, items);
    }
    if ((items = (data.boneWeight || data.boneWeights)) && items.length) {
        this.addAttribute("boneWeight", items.length, this.boneWeightCount, NativeFloat32Array, false, items);
    }
    if ((items = (data.boneIndex || data.boneIndices)) && items.length) {
        this.addAttribute("boneIndex", items.length, this.boneWeightCount, NativeFloat32Array, false, items);
    }

    if (noIndices && this.hasAttribute("position")) {
        this.index = createIndexTypeArray(NativeUint16Array, this.getAttribute("position").size());
    }

    if (dataBones && dataBones.length) {
        i = -1;
        il = dataBones.length - 1;
        while (i++ < il) {
            dataBone = dataBones[i];
            bone = Bone.create(dataBone.parent, dataBone.name);

            vec3.copy(bone.position, dataBone.position);
            quat.copy(bone.rotation, dataBone.rotation);
            vec3.copy(bone.scale, dataBone.scale);
            mat4.copy(bone.bindPose, dataBone.bindPose);
            bone.skinned = !!dataBone.skinned;

            bones[bones.length] = bone;
        }
    }

    this.calculateAABB();
    this.calculateBoundingSphere();

    return data;
};

function createIndexArray(count) {
    var array = new Array(count),
        i = count;

    while (i--) {
        array[i] = i;
    }

    return array;
}

function createIndexTypeArray(Class, count) {
    return new Class(createIndexArray(count));
}

GeometryPrototype.calculateAABB = function() {
    var position = this.attributes.getObject().position;

    if (position) {
        aabb3.fromPointArray(this.aabb, position.array);
    }
    return this;
};

GeometryPrototype.calculateBoundingSphere = function() {
    var position = this.attributes.getObject().position,
        bx = 0,
        by = 0,
        bz = 0,
        maxRadiusSq, maxRadiusSqTest, x, y, z, array, i, il, invLength;

    if (position) {
        array = position.array;
        maxRadiusSq = 0;

        i = 0;
        il = array.length;

        while (i < il) {
            x = array[i];
            y = array[i + 1];
            z = array[i + 2];

            bx += x;
            by += y;
            bz += z;

            maxRadiusSqTest = x * x + y * y + z * z;

            if (maxRadiusSq < maxRadiusSqTest) {
                maxRadiusSq = maxRadiusSqTest;
            }

            i += 3;
        }

        invLength = il === 0 ? 0 : 1 / il;
        bx *= invLength;
        by *= invLength;
        bz *= invLength;

        vec3.set(this.boundingCenter, bx, by, bz);
        this.boundingRadius = maxRadiusSq !== 0 ? mathf.sqrt(maxRadiusSq) : 0;
    }

    return this;
};

var calculateNormals_u = vec3.create(),
    calculateNormals_v = vec3.create(),
    calculateNormals_uv = vec3.create(),

    calculateNormals_va = vec3.create(),
    calculateNormals_vb = vec3.create(),
    calculateNormals_vc = vec3.create(),

    calculateNormals_faceNormal = vec3.create();

GeometryPrototype.calculateNormals = function() {
    var u = calculateNormals_u,
        v = calculateNormals_v,
        uv = calculateNormals_uv,
        faceNormal = calculateNormals_faceNormal,

        va = calculateNormals_va,
        vb = calculateNormals_vb,
        vc = calculateNormals_vc,

        attributes = this.attributes,
        attributesHash = attributes.getObject(),
        position = attributesHash.position,
        normal = attributesHash.normal,
        index = this.index,
        x, y, z, nx, ny, nz, length, i, il, a, b, c, n;

    position = position ? position.array : null;

    if (isNullOrUndefined(position)) {
        throw new Error("Geometry.calculateNormals: missing required attribures position");
    }
    if (isNullOrUndefined(index)) {
        throw new Error("Geometry.calculateNormals: missing required attribures index");
    }

    length = position.length;

    if (isNullOrUndefined(normal)) {
        this.addAttribute("normal", length, 3, NativeFloat32Array);
        normal = attributesHash.normal.array;
    } else {
        normal = normal.array;
        i = -1;
        il = length - 1;
        while (i++ < il) {
            normal[i] = 0;
        }
    }

    if (index) {
        i = 0;
        il = length;

        while (i < il) {
            a = index[i];
            b = index[i + 1];
            c = index[i + 2];

            x = position[a * 3];
            y = position[a * 3 + 1];
            z = position[a * 3 + 2];
            vec3.set(va, x, y, z);

            x = position[b * 3];
            y = position[b * 3 + 1];
            z = position[b * 3 + 2];
            vec3.set(vb, x, y, z);

            x = position[c * 3];
            y = position[c * 3 + 1];
            z = position[c * 3 + 2];
            vec3.set(vc, x, y, z);

            vec3.sub(u, vc, vb);
            vec3.sub(v, va, vb);

            vec3.cross(uv, u, v);

            vec3.copy(faceNormal, uv);
            vec3.normalize(faceNormal, faceNormal);
            nx = faceNormal[0];
            ny = faceNormal[1];
            nz = faceNormal[2];

            normal[a * 3] += nx;
            normal[a * 3 + 1] += ny;
            normal[a * 3 + 2] += nz;

            normal[b * 3] += nx;
            normal[b * 3 + 1] += ny;
            normal[b * 3 + 2] += nz;

            normal[c * 3] += nx;
            normal[c * 3 + 1] += ny;
            normal[c * 3 + 2] += nz;

            i += 3;
        }

        i = 0;
        il = length;

        while (i < il) {
            x = normal[i];
            y = normal[i + 1];
            z = normal[i + 2];

            n = 1 / mathf.sqrt(x * x + y * y + z * z);

            normal[i] *= n;
            normal[i + 1] *= n;
            normal[i + 2] *= n;

            i += 3;
        }

        this.emit("update");
    }

    return this;
};

var calculateTangents_tan1 = [],
    calculateTangents_tan2 = [],
    calculateTangents_sdir = vec3.create(),
    calculateTangents_tdir = vec3.create(),
    calculateTangents_n = vec3.create(),
    calculateTangents_t = vec3.create(),
    calculateTangents_tmp1 = vec3.create(),
    calculateTangents_tmp2 = vec3.create(),
    calculateTangents_tmp3 = vec3.create();
GeometryPrototype.calculateTangents = function() {
    var tan1 = calculateTangents_tan1,
        tan2 = calculateTangents_tan2,
        sdir = calculateTangents_sdir,
        tdir = calculateTangents_tdir,
        n = calculateTangents_n,
        t = calculateTangents_t,
        tmp1 = calculateTangents_tmp1,
        tmp2 = calculateTangents_tmp2,
        tmp3 = calculateTangents_tmp3,

        attributes = this.attributes,
        index = this.index,
        attributeHash = attributes.getObject(),
        position = attributeHash.position,
        normal = attributeHash.normal,
        tangent = attributeHash.tangent,
        uv = attributeHash.uv,

        v1 = tmp1,
        v2 = tmp2,
        v3 = tmp3,
        w1x, w1y, w2x, w2y, w3x, w3y,

        x1, x2, y1, y2, z1, z2,
        s1, s2, t1, t2,
        a, b, c, x, y, z,

        length, r, w, i, il, j, tmp;

    position = position ? position.array : null;
    uv = uv ? uv.array : null;
    normal = normal ? normal.array : null;

    if (isNullOrUndefined(normal)) {
        throw new Error("Geometry.calculateTangents: missing required attribure normal");
    }
    if (isNullOrUndefined(uv)) {
        throw new Error("Geometry.calculateTangents: missing required attribure uv");
    }
    if (isNullOrUndefined(index)) {
        throw new Error("Geometry.calculateTangents: missing indices");
    }
    if (isNullOrUndefined(position)) {
        throw new Error("Geometry.calculateTangents: missing required attribure position");
    }

    length = position.length;

    if (isNullOrUndefined(tangent)) {
        this.addAttribute("tangent", (4 / 3) * length, 4, NativeFloat32Array);
        tangent = attributeHash.tangent.array;
    } else {
        tangent = tangent.array;
        i = -1;
        il = length - 1;
        while (i++ < il) {
            tangent[i] = 0;
        }
    }

    i = -1;
    il = length - 1;
    while (i++ < il) {
        vec3.set(tan1[i] || (tan1[i] = vec3.create()), 0, 0, 0);
        vec3.set(tan2[i] || (tan2[i] = vec3.create()), 0, 0, 0);
    }

    i = 0;
    il = length / 3;

    while (i < il) {
        a = index[i];
        b = index[i + 1];
        c = index[i + 2];

        x = position[a * 3];
        y = position[a * 3 + 1];
        z = position[a * 3 + 2];
        vec3.set(v1, x, y, z);

        x = position[b * 3];
        y = position[b * 3 + 1];
        z = position[b * 3 + 2];
        vec3.set(v2, x, y, z);

        x = position[c * 3];
        y = position[c * 3 + 1];
        z = position[c * 3 + 2];
        vec3.set(v3, x, y, z);

        w1x = uv[a];
        w1y = uv[a + 1];
        w2x = uv[b];
        w2y = uv[b + 1];
        w3x = uv[c];
        w3y = uv[c + 1];

        x1 = v2[0] - v1[0];
        x2 = v3[0] - v1[0];
        y1 = v2[1] - v1[1];
        y2 = v3[1] - v1[1];
        z1 = v2[2] - v1[2];
        z2 = v3[2] - v1[2];

        s1 = w2x - w1x;
        s2 = w3x - w1x;
        t1 = w2y - w1y;
        t2 = w3y - w1y;

        r = s1 * t2 - s2 * t1;
        r = r !== 0 ? 1 / r : 0;

        vec3.set(
            sdir, (t2 * x1 - t1 * x2) * r, (t2 * y1 - t1 * y2) * r, (t2 * z1 - t1 * z2) * r
        );

        vec3.set(
            tdir, (s1 * x2 - s2 * x1) * r, (s1 * y2 - s2 * y1) * r, (s1 * z2 - s2 * z1) * r
        );

        tmp = tan1[a];
        vec3.add(tmp, tmp, sdir);
        tmp = tan1[b];
        vec3.add(tmp, tmp, sdir);
        tmp = tan1[c];
        vec3.add(tmp, tmp, sdir);

        tmp = tan2[a];
        vec3.add(tmp, tmp, tdir);
        tmp = tan2[b];
        vec3.add(tmp, tmp, tdir);
        tmp = tan2[c];
        vec3.add(tmp, tmp, tdir);

        i += 3;
    }

    j = 0;
    i = 0;
    il = length;

    while (i < il) {
        vec3.copy(t, tan1[i]);

        n[0] = normal[i];
        n[1] = normal[i + 1];
        n[2] = normal[i + 2];

        vec3.copy(tmp1, t);
        vec3.sub(tmp1, tmp1, vec3.smul(n, n, vec3.dot(n, t)));
        vec3.normalize(tmp1, tmp1);

        n[0] = normal[i];
        n[1] = normal[i + 1];
        n[2] = normal[i + 2];
        vec3.cross(tmp2, n, t);

        w = (vec3.dot(tmp2, tan2[i]) < 0.0) ? -1.0 : 1.0;

        tangent[j] = tmp1[0];
        tangent[j + 1] = tmp1[1];
        tangent[j + 2] = tmp1[2];
        tangent[j + 3] = w;

        j += 4;
        i += 3;
    }

    this.emit("update");

    return this;
};