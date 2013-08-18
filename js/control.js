control = {

    //  The camera, scene and renderer vars are all to do with THREE.js
    //  this will give us access them (to move around etc.) at any time
    camera: null,
    scene: null,
    renderer: null,
    mesh: null,

    //  The size stuff goes here
    baseWidth: 800,
    baseHeight: 450,
    segments: 100,
    sides: 20,

    //  This timer will handle when we atempt to resize the stage
    windowResizeTrm: null,
    originalVerts: [],
    newScales: [],

    paused: false,

    //  Keep track of the UI stuff.
    ui: {
        canvas: null,
        context: null,
        mouseIsDown: false,
        mousedown: {
            x: null,
            y: null,
            percent: {
                x: null,
                y: null
            }
        },
        mousepos: {
            x: null,
            y: null,
        },
        size: {
            base: {
                width: 1600,
                height: 900
            },
            current: {
                width: 1600,
                height: 900
            }
        }
    },

    object: {
        baseRotation: {
            x: 0,
            y: 0,
            z: 90 * Math.PI / 180
        },
        rotation: {
            x: 0,
            y: 0,
            z: 0
        }
    },

    init: function() {

        //  Sets up the render area, camera, scene and so on.
        this.setRenderArea();
        this.camera = new THREE.PerspectiveCamera( 50, this.baseWidth / this.baseHeight, 1, 10000 );
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog( 0x000000, 1, 6000 );
        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.setSize( $('.threeHolder').width(), $('.threeHolder').height() );
        $('.threeHolder').append( $(this.renderer.domElement) );

        //  Throw all the objects into the scene
        this.buildScene();

        //  Update the size of the render area when we change the window size.
        $(window).resize( function() {
            clearTimeout(control.windowResizeTrm);
            control.windowResizeTrm = setTimeout(function() {
                control.setRenderArea();
            }, 600);
        });

        //  Trap keypresses for (r)ender and (p)ause
        $(document).bind('keyup', function(e) {

            // (r)ender.
            if (e.keyCode == 82) {
                control.paused = true;
                sunflow.render(control.scene, control.camera, control.renderer, {x: 0, y: 0, z: 0}, true);
                $( "#dialog" ).fadeIn('fast');
            }

            //  (p)ause
            if (e.keyCode == 80) {
                if (control.paused) {
                    control.paused = false;
                } else {
                    control.paused = true;
                }
            }

        });


        //  close the dialog when we click the link in it
        $('#dialog a').bind('click', function() {
            $('#dialog').fadeOut('fast');
        });


        //  Call the function that adds the mouse controls to the UI
        this.buildUI();

    },

    buildUI: function() {


        //  Get the canvas
        control.ui.canvas = $('.ui-cover')[0];
        control.ui.context = control.ui.canvas.getContext('2d');

        //  Start the whole line drawing thing when the mouse goes
        //  down
        $('.ui-cover').bind('mousedown', function(e) {
            control.ui.mousedown.x = e.pageX - this.offsetLeft;
            control.ui.mousedown.y = e.pageY - this.offsetTop;
            control.ui.mousedown.percent.x = control.ui.mousedown.x / control.ui.size.current.width * control.ui.size.base.width;
            control.ui.mousedown.percent.y = control.ui.mousedown.y / control.ui.size.current.height * control.ui.size.base.height;

            control.ui.mouseIsDown = true;
        });

        var stopDrag = function() {
            control.ui.context.clearRect(0, 0, control.ui.size.base.width, control.ui.size.base.height);
            control.object.baseRotation.x = control.scene.children[0].rotation.x;
            control.object.baseRotation.y = control.scene.children[0].rotation.y;
            control.object.baseRotation.z = control.scene.children[0].rotation.z;
            control.object.rotation.x = 0;
            control.object.rotation.y = 0;
            control.object.rotation.z = 0;
        };

        //  Stop when the mouse comes back up or exits the ui
        $('.ui-cover').bind('mouseup', function(e) {
            control.ui.mouseIsDown = false;
            stopDrag();
        });

        $('.ui-cover').bind('mouseleave', function(e) {
            control.ui.mouseIsDown = false;
            stopDrag();
        });

        //  Do the mouse move stuff
        $('.ui-cover').bind('mousemove', function(e) {
            control.ui.mousepos.x = e.pageX - this.offsetLeft;
            control.ui.mousepos.y = e.pageY - this.offsetTop;
        });

        //  Set the mouse move interval timer away, this is where
        //  we'll do the actual drawing
        setInterval(function() {
            control.mouseUI();
        }, 1000/60); // 24 fps

    },


    mouseUI: function() {

        //  If the mouse is down then we need to be drawing a line
        //  on the canvas
        if (control.ui.mouseIsDown) {

            var percentPosX = control.ui.mousepos.x / control.ui.size.current.width * control.ui.size.base.width;
            var percentPosY = control.ui.mousepos.y / control.ui.size.current.height * control.ui.size.base.height;

            var percentDiffX = (percentPosX - control.ui.mousedown.percent.x) / control.ui.size.base.width;
            var percentDiffY = (percentPosY - control.ui.mousedown.percent.y) / control.ui.size.base.height;
            control.object.rotation.y = (180 * percentDiffX) * Math.PI / 180;
            control.object.rotation.x = (180 * percentDiffY) * Math.PI / 180;


            control.ui.context.clearRect(0, 0, control.ui.size.base.width, control.ui.size.base.height);

            //  Do the horizontal line first
            control.ui.context.strokeStyle = '#ffff00';
            control.ui.context.beginPath();
            control.ui.context.moveTo(control.ui.mousedown.percent.x, control.ui.mousedown.percent.y);
            control.ui.context.lineTo(percentPosX, control.ui.mousedown.percent.y);
            control.ui.context.lineTo(percentPosX, percentPosY);
            control.ui.context.stroke();

            control.ui.context.strokeStyle = '#ff0000';
            control.ui.context.beginPath();
            control.ui.context.moveTo(control.ui.mousedown.percent.x, control.ui.mousedown.percent.y);
            control.ui.context.lineTo(percentPosX, percentPosY);
            control.ui.context.stroke();

        }
    },


    buildScene: function() {

        this.camera.position.x = 0;
        this.camera.position.z = 3000;
        this.camera.position.y = 0;
        this.camera.lookAt(new THREE.Vector3( 0, 0, 0 ));

        var cubeSize = 20;
        var color = new THREE.Color( 0xCCCCCC );
        var cube = new THREE.CubeGeometry( cubeSize, cubeSize, cubeSize );
        var material = new THREE.MeshBasicMaterial( { side: THREE.DoubleSide, shading: THREE.FlatShading, vertexColors: THREE.FaceColors } );
        var material = new THREE.MeshNormalMaterial( { side: THREE.DoubleSide } );
        var newScale = 1;

        var cylinder = new THREE.CylinderGeometry(400, 400, 2500, control.sides, control.segments, true);
        newCylinder = new THREE.Mesh(cylinder, material );
        this.scene.add( newCylinder );

        var light = new THREE.PointLight( 0xffffff );
        light.position.set( -300, -500, 700 );
        this.scene.add( light );
        var light2 = new THREE.PointLight( 0xcccccc );
        light2.position.set( 500, 0, 550 );
        this.scene.add( light2 );

        //  make a whole new set of scales for the number of segments we have
        for (var i = 0; i < control.segments; i++) {
            control.newScales.push(1);
        }

        //  Copy over all the verts into the originalVerts array
        for (var v = 0; v < (control.sides+1) * (control.segments+1); v++) {
            control.originalVerts.push({
                x: control.scene.children[0].geometry.vertices[v].x,
                y: control.scene.children[0].geometry.vertices[v].y,
                z: control.scene.children[0].geometry.vertices[v].z
            });
        }

        //control.scene.children[0].rotation.z = 0.04;

        setInterval(function() {
            control.mutate();
        }, 1000/60);

    },

    mutate: function() {

        if (control.paused) return;

        //  move the newScale down one
        control.newScales.shift();
        control.newScales.push(((Math.sin(new Date() / 3  * Math.PI / 180)/2+0.5)*1)+1);

        var r = 0;
        var g = 0;
        var b = 0;

        var thisVert = null;
        var thisFace = null;

        for (var segment = 0; segment <= control.segments; segment++) {

            for (var side = 0; side <= control.sides; side++) {
                thisVert = (segment * (control.sides+1)) + side;
                control.scene.children[0].geometry.vertices[thisVert].x = control.originalVerts[thisVert].x * control.newScales[segment];
                control.scene.children[0].geometry.vertices[thisVert].z = control.originalVerts[thisVert].z * control.newScales[segment];
            }
        }

        var msr = new Date() / 3000;
        var msg = new Date() / 2000;
        var msb = new Date() / 1000;
        for (var side = 0; side < control.sides; side++) {
            for (var segment = 0; segment < control.segments; segment++) {
                r = Math.floor((Math.sin(msr + side) / 2 + 0.5) * 255);
                g = Math.floor((Math.sin(msg + side) / 2 + 0.5) * 255);
                b = Math.floor((Math.sin(msb + side) / 2 + 0.5) * 255);
                thisFace = (segment * control.sides) + side;
                control.scene.children[0].geometry.faces[thisFace].color = new THREE.Color('rgb(' + r + ',' + g + ',' + b + ')');
            }
        }

        control.scene.children[0].geometry.verticesNeedUpdate = true;
        control.scene.children[0].geometry.colorsNeedUpdate = true;

    },




    animate: function() {

        requestAnimationFrame( control.animate );

        if (control.paused) return;

        control.scene.children[0].rotation.x = control.object.baseRotation.x + control.object.rotation.x;
        control.scene.children[0].rotation.y = control.object.baseRotation.y + control.object.rotation.y;
        control.scene.children[0].rotation.z = control.object.baseRotation.z + control.object.rotation.z;

        /*
        control.scene.children[0].rotation.x = Math.sin(90 * Math.PI / 180);
        //control.scene.children[0].rotation.y = Math.sin(120 * Math.PI / 180);
        //control.scene.children[0].rotation.y += Math.sin(new Date()/10000) * 0.05;
        control.scene.children[0].rotation.y += 0.01;

        control.scene.children[0].rotation.z = Math.sin(60 * Math.PI / 180);
        //control.scene.children[0].rotation.z = Math.sin(new Date()/3000) * 0.015;
        //control.scene.children[0].rotation.x = (90 * Math.PI / 180) + Math.sin(new Date()/1111) * 0.015;
        */

        control.renderer.render( control.scene, control.camera );

    },




    setRenderArea: function() {

        //  Calculate the size of the "stage", to see if we can get it into
        //  16:9 ratio
        var stageWidth = $('body').innerWidth();
        var stageHeight = Math.floor(stageWidth/16*9);

        //  if the new height is too high to be displayed
        //  then we have to go the other way.
        if (stageHeight > $('body').innerHeight()) {
            stageHeight = $('body').innerHeight();
            stageWidth = Math.floor(stageHeight/9*16);
        }

        control.ui.size.current.width = stageWidth;
        control.ui.size.current.height = stageHeight;

        var stageTop = Math.floor(($('body').innerHeight() - stageHeight)/2);
        var stageLeft = Math.floor(($('body').innerWidth() - stageWidth)/2);

        //  Now set stage size of the canvas
        $('.stage').css({
            'width': stageWidth,
            'height': stageHeight,
            'top': stageTop,
            'left': stageLeft
        });

        //  set the canvas, just incase we can.
        $('.threeHolder canvas').css({width: '100%', height: '100%'});

        try {
            control.renderer.setSize( stageWidth, stageHeight );
        } catch(er) {
            //  NOWT
        }

    }
}