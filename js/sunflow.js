sunflow = {
    //  This function goes through the camera position, the target
    //  and all the objects in the scene
    //  It bundles all that up into a JSON object which it POSTS
    //  to the node.js backend, which will use all of that to
    //  write the .sc file needed for Sunflow and kick off the rendering
    //
    //  In theory this would be nice if we could *just* send the
    //  scene and camera over. Which we can, but I'm still accessing
    //  the target which we hold on control.
    //
    //  I'm not sure how to get the target from *just* the camera info
    //  without having to run the calculations backwards from its
    //  rotations... which I *can* just not quite yet, need a coffee
    //  first and I don't drink coffee.
    //
    //  So for the moment, let's just pretend that it's *nearly*
    //  totally free from "knowing" control stuff
    render: function(scene, camera, renderer, lookat, colourMesh) {

        //  First of all we are going to work out a bunch of
        //  parameters to deal with, make the empty param thing
        var params = {
            colourMesh: colourMesh
        };

        //  send over the dimensions, which come from the
        //  renderer. There's probably a better way of asking
        //  the renderer for this information, but for the
        //  moment let's go directly for the throat.
        params.size = {
            width: 1600,
            height: 900
        };

        //  add the camera
        //  TODO, work out the lookat position from the camera, not directly
        //  from the control object
        params.camera = {
            fov: camera.fov,
            position: {x: parseFloat(camera.position.x), y: parseFloat(camera.position.y), z: parseFloat(camera.position.z)},
            lookat: {x: lookat.x, y: lookat.y, z: lookat.z},
            aspect: params.size.width / params.size.height
        };

        //  Now throw all the objects in, set up all the vars
        //  we are going to be using, 'cause reasons
        params.objects = [];
        var mesh = null;
        var meshes = scene.getDescendants();
        var object = {};
        var newVertics = null;

        //  go thru all the meshes in the scene
        for (var i in meshes) {

            mesh = meshes[i];
            object = {};

            //  Try and grab the colour from the model
            if ('material' in mesh && 'color' in mesh.material) {
                object.colour = {
                    r: mesh.material.color.r,
                    g: mesh.material.color.g,
                    b: mesh.material.color.b
                };
            }

            //  Find out what type of object it is, so we can handle it
            //  in different ways
            //
            //  There is probably a better way of detecting a SPHERE than this
            //  but for the moment this will do. If there is a "Radius" in 
            //  the geometry the let's *assume* it's a sphere, otherwise
            //  let's *assume* it's a mesh object
            if ('geometry' in mesh && 'radius' in mesh.geometry) {

                //  if it's a sphere then we can jyst do that here
                object.type = 'sphere';
                object.position = {x: parseFloat(mesh.position.x), y: parseFloat(mesh.position.y), z: parseFloat(mesh.position.z)};
                object.radius = parseFloat(mesh.geometry.radius);

                //  Add the object
                params.objects.push(object);

            } else if ('geometry' in mesh && 'vertices' in mesh.geometry && 'faces' in mesh.geometry) {

                //  otherwise it's a mesh and we need to pass over the vertices and faces
                object.type = 'mesh';
                object.vertices = [];
                object.faces = [];

                //  Go through all the vertices
                for (var v in mesh.geometry.vertices) {

                    //  convert the vertices from local to world locations (so we don't
                    //  have to pass the rotation, position and scale over to the backend)
                    newVertics =mesh.geometry.vertices[v].clone();
                    newVertics = newVertics.applyMatrix4(mesh.matrixWorld);
                    object.vertices.push({x: newVertics.x, y: newVertics.y, z: newVertics.z});

                }

                //  Now go thru all the faces.
                for (var f in mesh.geometry.faces) {

                    //  If there are 4 vertices used in this face (i.e. it's a QUAD) and we should
                    //  really use the *proper* way to check if it is or not (Face3 vs Face4) just
                    //  as soon as I've gotten round to figuring it out...
                    //  ...anyway, if there are 4 vertices then we can split those into two 3 vertices
                    //  faces by using a,b,c and a,c,d which is the same as a,b,c,d just split.
                    if ('d' in mesh.geometry.faces[f]) {
                        object.faces.push([mesh.geometry.faces[f].a, mesh.geometry.faces[f].b, mesh.geometry.faces[f].c, mesh.geometry.faces[f].color.r, mesh.geometry.faces[f].color.g, mesh.geometry.faces[f].color.b]);
                        object.faces.push([mesh.geometry.faces[f].a, mesh.geometry.faces[f].c, mesh.geometry.faces[f].d, mesh.geometry.faces[f].color.r, mesh.geometry.faces[f].color.g, mesh.geometry.faces[f].color.b]);
                    } else {
                        object.faces.push([mesh.geometry.faces[f].a, mesh.geometry.faces[f].b, mesh.geometry.faces[f].c, mesh.geometry.faces[f].color.r, mesh.geometry.faces[f].color.g, mesh.geometry.faces[f].color.b]);
                    }
                }

                //  Add the object
                params.objects.push(object);

            } else {
                // If it wasn't a SPHERE or a MESH, then, huh, who knows, maybe a TORUS :)
            }


        }

        //  Tell the backend what filename to use
        //  (so in theory we can set up sequential files)
        params.filename = 'test';
        sunflow.createScene(params);

    },

    //  A very poor way of checking for the file existing on the back end
    //  In an ideal world we'll have the backend serve up the valid image
    //  but for the moment we are asking if it exists.
    createScene: function(queryObject) {

        var data = "";

        data += this.topBit();
        data += this.image(queryObject.size);
        data += this.addCamera(queryObject.camera);
        data += this.shaders(queryObject.objects, queryObject.colourMesh);
        data += this.objects(queryObject.objects, queryObject.colourMesh);

        localStorage.setItem('scene', data);

    },

    topBit: function() {

        var d = new Date();

        var comment = '/*\n' +
        '# This is a Sunflow scene description. Do a Select All and Copy & Paste into a text document,\n' +
        '# save as "scene.sc" and load it into Sunflow to be rendered ("Save As..." will not work).\n' +
        '# Sunflow: http://sunflow.sourceforge.net/\n' +
        '# "scene.sc" can be any filename you like, but needs the .sc extension.\n' +
        '#\n' +
        '# Generated by CAT826 Sunflow Filemaker, ' + d + '\n' +
        '# More information...\n' +
        '# Blogpost: \n' +
        '# Github: \n' +
        '*/\n' +
        '\n';

        var x = 'trace-depths {\n' +
            '  diff 4\n' +
            '  refl 3\n' +
            '  refr 2\n' +
            '}\n' +
            '\n' +
            'gi {\n' +
            '   type ambocc\n' +
            '   bright { "sRGB nonlinear" 1 1 1 }\n' +
            '   dark { "sRGB nonlinear" 0 0 0 }\n' +
            '   samples 64\n' +
            '   maxdist 200.0\n' +
            '}\n' +
            '\n' +
            'background {\n' +
            '   color  { "sRGB nonlinear" 0.0 0.0 0.0 }\n' +
            '}\n' +
            '\n' +
            'shader {\n' +
            '  name debug_caustics\n' +
            '  type view-caustics\n' +
            '}\n' +
            '\n' +
            'shader {\n' +
            '  name debug_globals\n' +
            '  type view-global\n' +
            '}\n' +
            '\n' +
            'shader {\n' +
            '  name debug_gi\n' +
            '  type view-irradiance\n' +
            '}\n' +
            'shader {\n' +
            '  name Grey\n' +
            '  type diffuse\n' +
            '  diff 0.7 0.7 0.7\n' +
            '}\n' +
            '\n' +
            'shader {\n' +
            '  name Red\n' +
            '  type diffuse\n' +
            '  diff 0.8 0.0 0.0\n' +
            '}\n' +
            '\n' +
            'shader {\n' +
            '  name DarkGrey\n' +
            '  type diffuse\n' +
            '  diff 0.2 0.2 0.2\n' +
            '}\n' +
//            'object {\n' +
//            '   shader Grey\n' +
//            '   type plane\n' +
//            '   p 0 0 0\n' +
//            '   n 0 0 1\n' +
//            '}\n' +
            '\n';
        return comment + x;

    },

    image: function(sizeNode) {

        var i = 'image {\n' +
            '  resolution ' + Math.floor(sizeNode.width) + ' ' + Math.floor(sizeNode.height) + '\n' +
            '  aa 1 2\n' +
            '  filter gaussian\n' +
            '}\n' +
            '\n';
        return i;

    },

    addCamera: function(cameraNode) {

        //  NOTE!!!
        //  The FOV in Sunflow doesn't seem to be correct, or at least it certainly
        //  doesn't match the output of THREE.js. a fov of 59 is about right for
        //  a ratio of 16:9
        //
        //  I don't know why, one day I'll figure it out but for the moment
        //  be aware that changing the ratio of the canvas we are rendering to
        //  with THREE.js means you'll have to tweek the fov by hand to match
        //  (and it won't be what you expect it to be)
        var position = this.convertPosition(cameraNode.position);
        var lookat = this.convertPosition(cameraNode.lookat);
        var c = 'camera {\n' +
              '  type pinhole\n' +
              '  eye    ' + position.x + ' ' + position.y + ' ' + position.z + '\n' +
              '  target ' + lookat.x + ' ' + lookat.y + ' ' + lookat.z + '\n' +
              '  up     0 0 1\n' +
              '  fov    79\n' +
              '  aspect ' + parseFloat(cameraNode.aspect) + '\n' +
              '}\n' +
              '\n';
        return c;
    },

    shaders: function(objectArray, colourMesh) {

        var o = '';
        var object = null;

        for (var i in objectArray) {
            object = objectArray[i];

            if ('colour' in object) {
                o += 'shader {\n' +
                '  name Object' + i + '\n' +
                '  type diffuse\n' +
                '  diff ' + object.colour.r + ' ' + object.colour.g + ' ' + object.colour.b + '\n' +
                '}\n' +
                '\n';
            } else {
                o += 'shader {\n' +
                '  name Object' + i + '\n' +
                '  type diffuse\n' +
                '  diff 0.7 0.7 0.7\n' +
                '}\n' +
                '\n';
            }

            if (object.type == 'mesh' && colourMesh) {
                for (var f in object.faces) {
                    o += 'shader {\n' +
                    '  name Object' + i + '_Face' + f + '\n' +
                    '  type diffuse\n' +
                    '  diff ' + object.faces[f][3] + ' ' + object.faces[f][4] + ' ' + object.faces[f][5] + '\n' +
                    '}\n' +
                    '\n';
                }
            }
        }

        return o;
    },

    objects: function(objectArray, colourMesh) {

        var shader = null;
        var o = '';
        var object = null;

        for (var i in objectArray) {
            object = objectArray[i];

            if (colourMesh) {
                o += 'object {\n' +
                '  shaders ' + object.faces.length + '\n';
                for (var f in object.faces) {
                    o += '    Object' + i + '_Face' + f + '\n';
                }
                o += '\n';
            } else {
                shader = 'Object' + i;
                o += 'object {\n' +
                    '  shader ' + shader + '\n';
            }

            //  If it's a sphere then we can easily do that here.
            if (object.type == 'sphere') {
                object.position = this.convertPosition(object.position);

                o += '  type sphere\n' +
                '  c ' + object.position.x + ' ' + object.position.y + ' ' + object.position.z + '\n' +
                '  r ' + object.radius + '\n';
            }

            if (object.type == 'mesh') {

                o += '  type generic-mesh\n' +
                '\n' +
                '  points ' + object.vertices.length + '\n';

                for (var v in object.vertices) {
                    object.vertices[v] = this.convertPosition(object.vertices[v]);
                    o += '    ' + object.vertices[v].x + ' ' + object.vertices[v].y + ' ' + object.vertices[v].z + '\n';
                }

                o += '\n' +
                '  triangles ' + object.faces.length + '\n';

                for (var f2 in object.faces) {
                    o += '    ' + object.faces[f2][0] + ' ' + object.faces[f2][1] + ' ' + object.faces[f2][2] + '\n';
                }

                o += '  normals none\n';
                o += '  uvs none\n';
                if (colourMesh) {
                    o +='  face_shaders\n';
                    for (var f3 in object.faces) {
                        o += '   ' + f3 + '\n';
                    }
                }

            }

            o += '}\n' +
            '\n';
            //  if it's a matrix then that's a little more hard work
            //  CONVERT ALL VERTEX AND FACES HERE

        }

        return o;

    },

    addSphere: function(position, r) {

        position = this.convertPosition(position);

        var shader = 'Grey';
        var o = 'object {\n' +
            '  shader ' + shader + '\n' +
            '  type sphere\n' +
            '  c ' + position.x + ' ' + position.y + ' ' + position.z + '\n' +
            '  r ' + r + '\n' +
            '}\n';
        return o;

    },

    convertPosition: function(position) {

        var newPosition = {
            x: parseFloat(position.x),
            y: parseFloat(-position.z),
            z: parseFloat(position.y)
        };
        return newPosition;

    }

};