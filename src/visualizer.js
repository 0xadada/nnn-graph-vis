(function() { 
    app.factory('Visualizer', function($http,$log,$rootScope,NodeDataManager,ColorManager) {

        var INITIALIZE = 'Visualizer: INITIALIZE';
        var NODE_INITIALIZED = 'Visualizer: NODE_INITIALIZED';  // possible call for staggering node generation to alleviate processor lag
        var NODE_TARGETTED = 'Visualizer: NODE_TARGETTED';
        var ATTRIBUTE_ROLL_OVER = 'Visualizer: ATTRIBUTE_ROLL_OVER';
        var ATTRIBUTE_SELECTED = 'Visualizer: ATTRIBUTE_SELECTED';


        var _wHalfX = window.innerWidth/2;
        var _wHalfY = window.innerHeight/2;

        var _nodeDataManager;
        var _colorManager;

        var _mouseDeltaX = 0;
        var _mouseDeltaY = 0;
        var _mouseStartX;
        var _mouseStartY;
        var _mouseIsDown;
        var _mouse = {x:0,y:0};

        // camera, lighting, scene base components
        var _camera; // Camera Object
        var _cameraTarget; // object for camera to track
        var _cameraZoom; // distance the the camera is from cameraTarget;
        var _cameraTrackActive = false; // determines if the camera is tweening to a new location.


        var _projector;
        var _targetList;

        var _light;
        var _ambLight; // centeal point light
        var _cameraLight;
        var _centralLight;
        var _centralLightTween;

        var _neuronLights = [];
        var _neuronLightTweens = [];
        var _metaVerse;
        var _metaVerseBoundary;
        var _metaVerseRange;

        var _scene;  // Scene this is all rendered in.
        var _postProcessing; // Post processing effects for deapth of field.
        var _bokehParams; // params for boken post processing DOF effect.
        var _materialDepth; //
        var _renderer; // three rendering engine.
        var _container; // what this is all sitting in on the stage.
        var _isolatedNode; // currently active centered node.
        var _activeNode;
        var _scope;

        var _mouseOverObject;


        //node properties
        var _nodeTextureMat; // mapped texture applied to node faces
        var _attributeTextureMat;
        var _ribbonMat;
        var _attributeRibbonMat;
        var _wireframeMat;
        var _textureUVs; // uv coordinates for applying textureMat to each face.
        var _attrParticleMat; // particle material
        var _nodePartMat;

        var _attrGlowMat;
        var _nodeGlowMat;
        var _electrifiedGlows;
        var _glows;

        var _lineConnectionMats;    // object to store connection mats in relationship to weight value;

        var _ribbonConnectionMats;  // object to store connection mats in relationship to weight value;
        var _positiveHighConnectionMeshMat;
        var _positiveMidConnectionMeshMat;
        var _negativeMidConnectionMeshMat;
        var _negativeHighConnectionMeshMat;

        var _labelsArray = [];
        var _connectionsArray = [];
        var _particleGeomsArray = [];

        var _nodeDataManager = NodeDataManager;

        ////////////////////////////////
        //  PUBLIC FUNCTIONS
        ///////////////////////////////

        /** init sets up the THREE WebGL rendering engine and kicks off
         * animation.
         *
         * @param Object scope The lexical scope.
         * @param NodeDataManager nodeDataManager a common data provider.
         * @param ColorManager colorManager a common color utility factory.
         */
        function init(scope,nodeDataManager,colorManager) {
            _scope = scope;
            //$rootScope.$broadcast(INITIALIZE);
            _scope.$broadcast(INITIALIZE);
            _colorManager = colorManager;
            _nodeDataManager = nodeDataManager;

            _container = document.getElementById('visualizer');

            _camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 1, 30100 );
            _camera.position.set(-100,100,100);
            _cameraZoom = 500;

            _projector = new THREE.Projector();
            _targetList = [];

            _scene = new THREE.Scene();
            var fogColor = new THREE.Color(_colorManager.getFogColor());
            //_scene.fog = new THREE.FogExp2( 0x232345, 0.0006 );
            _scene.fog = new THREE.FogExp2( fogColor, 0.0026 );
            console.log(fogColor);

            _materialDepth = new THREE.MeshDepthMaterial();
            //TweenMax.to(fogColor,1,{r:255,g:255,b:255,repeat:-1,yoyo:true})
            //TweenMax.to(_scene.fog,1,{density:0,repeat:-1,yoyo:true})

            __initializeNodeTextures();

            _electrifiedGlows = [];
            _glows = [];

            _cameraTarget = new THREE.Object3D();
            _cameraTarget.position.set(0,0,0);
            _scene.add(_cameraTarget);


            _ambLight = new THREE.AmbientLight( _colorManager.getAmbientLightColor() );
            _light = new THREE.PointLight( _colorManager.getActiveNodeLightColor(),1.8,0);
            _light.position.set(500,200,200);
            _scene.add(_light);

            _cameraLight = new THREE.PointLight( _colorManager.getCameraLightColor(),_colorManager.getCameraLightIntensity(),0);
            _scene.add(_cameraLight);

            _centralLight = new THREE.PointLight(_colorManager.getCentralLightColor(),1.4,1500);
            _scene.add(_centralLight);
            _centralLightTween = TweenMax.to(_centralLight.position,5,{x:_camera.position.x,y:_camera.position.y,z:_camera.position.z,repeat:-1})

            _scene.add(_ambLight);
            _metaVerseRange = 1000;


            _metaVerse = __generateMetaVerse(_metaVerseRange,4,true,_metaVerseRange);
            _scene.add(_metaVerse);

            _metaVerseBoundary = __generateSky();
            _scene.add(_metaVerseBoundary)

            __initPostProcessing();


            /* Setting up the DoF parameters to bokeh shader */
            for( var e in _bokehParams ) {
                if( e in _postProcessing.bokeh_uniforms )
                    _postProcessing.bokeh_uniforms[e].value = _bokehParams[e];
            }
            _postProcessing.enabled = true;
            _postProcessing.bokeh_uniforms["znear"].value   = _camera.near;
            _postProcessing.bokeh_uniforms["zfar"].value    = _camera.far;
            _camera.setLens( _bokehParams.focalLength );

            _renderer = new THREE.WebGLRenderer( { clearAlpha: 1,antialias:true, alpha: true,autoClear:true} );
            _renderer.setSize( window.innerWidth, window.innerHeight );
            _renderer.autoClear = false;
            _container.appendChild( _renderer.domElement );

            $(document).on('mousemove', __onDocumentMouseMove);
            $(document).on('click',__onDocumentClick);
            $(document).on('mousedown',__onMouseDown);
            $(document).on('mouseup',__onMouseUp);
            $(document).on('mousewheel', __onDocumentMouseWheel);
            $(window).on('resize', __onWindowResize);

            __animate();
        }

        ////////////////////////////////////////////
        /// Node Specific public facing functions

        function createNode(nodeData,x,y,z)
        {
            addNodeToStage(nodeData,x,y,z);
        }


        function createNodes(nodes)
        {
            var i=0;
            var limit = nodes.length;
            for(i=0;i<limit;++i)
            {
                //console.log(nodes[i])
                //TweenMax.delayedCall(i/1000,addNodeToStage,[nodes[1]])
                addNodeToStage(nodes[i]);
            }
        }

        function addNodeToStage(nodeData,x,y,z) {
            console.log('visualizer.addNodeToStage:', x, y, z);

            var range = 2500;
            var node = __generateNode(range,nodeData,x,y,z);
            node.nodeData = nodeData;////new THREE.Object3D();
            nodeData.setVisualNode(node);
        }

        function removeNodeFromStage(nodeData) {
            _scene.remove(nodeData.getVisualNode());
        }


        function simulateNodeConstruction(nodeData) {
            //__alignNodeAttributes(nodeData.getVisualNode(),10,0,0);
            /*var i=0;
            var limit=attributes.limit;
            /*for (i=0;i<limit;++i)
            {
                TweenMax.
            }*/
            isolateNode(nodeData,0);
            targetNode(nodeData,1,false,2);
        }


        /**
         * targetNode activates the node and uses TweenMax to either jump
         * directly to the node, or fly to it using a bezier curve it defines.
         *
         * @param NodeData nodeData the object representing the node.
         * @param Number delay time to delay before moving to the node.
         * @param Boolean fly true to Jump directly, false to tween to the node.
         * @param Number speed how fast to focus on the node.
         */
        function targetNode(nodeData,delay,fly, speed)
        {
            //todo: proper error handling up in framework with warning of no data
            // todo2: create node in nether space and link, then move to.
            if (nodeData == undefined) return;
            var node = nodeData.getVisualNode();
            node.updateMatrixWorld();
            //node.updateProjectionMatrix();
            //_targetList.push(node.innerCore);
            activateNode(nodeData,true);
            _cameraTrackActive = true;
            _cameraZoom = 300;
            _scope.$broadcast(NODE_TARGETTED,nodeData.id);
            var bezPath = [];
            bezRange = _metaVerseRange * 4;
            //var speed = speed;
            if (fly) {
                bezPath = [{x:Math.random()*bezRange-(bezRange>>1), y:Math.random()*bezRange-(bezRange>>1), z:Math.random()*bezRange-(bezRange>>1)}, {x:Math.random()*bezRange-(bezRange>>1), y:Math.random()*bezRange-(bezRange>>1), z:Math.random()*bezRange-(bezRange>>1)}];
                //speed = 15
            }
            var bezierTargetObj = {curviness:2.25, values:bezPath.concat([{x:node.position.x, y:node.position.y, z:node.position.z}]), autoRotate:false};
            TweenMax.to([_cameraTarget.position,_light.position],speed,{x:node.position.x,y:node.position.y,z:node.position.z,ease:Quad.easeOut, bezier:bezierTargetObj})
            var bezierCameraObj = {curviness:2.25, values:bezPath.concat([{x:node.position.x, y:node.position.y, z:node.position.z+_cameraZoom}]), autoRotate:false};
            TweenMax.to([_camera.position,_cameraLight.position],speed,{delay:.5,x:node.position.x,y:node.position.y,z:node.position.z+_cameraZoom, bezier:bezierCameraObj ,ease:Quad.easeInOut, onComplete:__onCameraMoveComplete})

            node.updateMatrixWorld();

            _activeNode = node;
        }

        function activateNode(nodeData,construct) {
            if(construct === true)//nodeData.constructed === undefined)
            {
                nodeData.constructed = true;
            }
            __activateNodeModel(nodeData)
        }

        function isolateNode(nodeData, speed)
        {
            if (speed === undefined) speed = 1;
            if (_isolatedNode !== undefined) // return previous to outer rim
            {
                //console.log(_isolatedNode.coreRange)
                var returnVect = __randomSphereVector(Math.random()*_isolatedNode.coreRange + 50)
                TweenMax.to(_isolatedNode.position,1,{x:returnVect.x,y:returnVect.y,z:returnVect.z, ease:Quad.easeIn,onUpdate:__onNodeMove,onUpdateParams:[_isolatedNode.nodeData]});
            }
            var node = nodeData.getVisualNode();
            node.targetVector = new THREE.Vector3(0,0,0);
            TweenMax.to([node.position,_cameraTarget.position],speed,{x:0,y:0,z:0, ease:Quad.easeOut,onUpdate:__onNodeMove,onUpdateParams:[nodeData]});
            _isolatedNode = node;
        }

        function connectNode(nodeData,ribbons,spark)
        {
            var node = nodeData.getVisualNode();
            var i=0;
            var limit = nodeData.connections.length;
            //if (limit > 10) limit = 10;
            for (i=0;i<limit;++i)
            {
                //console.log(nodeData.connections[i].getConnectionNode())
                var connection = nodeData.connections[i];
                var targetID = connection.getConnectionNode();
                // todo: generate new node if none present
                if (_nodeDataManager.getNodeByID(targetID) === undefined) return;
                var linkNodeData = _nodeDataManager.getNodeByID(targetID);
                var linkedNode = linkNodeData.getVisualNode();
                activateNode(linkNodeData);
                if (linkedNode === undefined) return;

                var associationRange = (1-nodeData.connections[i].getWeight()+1)*800 + 20;
                var associationVector = __sphericalPosition(associationRange,theta,phi);  //__randomSphereVector

                //todo: check current connections and calculate relative position between all associated nodes.
                if (!connection.isConnected() && !linkNodeData.checkConnection(nodeData.getID()))
                {
                    connection.isConnected(true);
                    TweenMax.delayedCall(1,__linkNodes,[connection,ribbons,node,linkedNode,12]);
                    //TweenMax.to(linkedNode.position,1,{ease:Quad.easeInOut,x:node.position.x+associationVector.x,y:node.position.y+associationVector.y,z:node.position.z+associationVector.z,onUpdate:__onNodeMove,onUpdateParams:[linkNodeData]});
                }
                //__linkNodes(connection,ribbons,node,linkedNode,12);

                //__linkNodes(nodeData.connections[i].getWeight(),ribbons,node,linkedNode,12)
                //console.log(targetNode);
            }
        }

        function clusterNode(nodeData)
        {
            var node = nodeData.getVisualNode();
            node.isClustered = true;
            if (node === undefined) return;
            var i=0;
            var limit = nodeData.connections.length;
            //if (limit > 10) limit = 10;
            for (i=0;i<limit;++i)
            {
                node.isClustered = true;
                var connection = nodeData.connections[i];

                var targetID = connection.getConnectionNode();
                if (_nodeDataManager.getNodeByID(targetID) === undefined) return;
                var linkNodeData = _nodeDataManager.getNodeByID(targetID);
                var reverseConnection = linkNodeData.getConnectionByID(nodeData.getID());
                //if (reverseConnection !== undefined) console.log(connection.getWeight(),'==',reverseConnection.getWeight())
                var linkedNode = linkNodeData.getVisualNode();
                if (linkedNode === undefined) return;

                var associationRange = (1-nodeData.connections[i].getWeight()+1)*600 + 10;
                var theta = __calcTheta(node.position,linkedNode.position);
                var phi = __calcPhi(node.position,linkedNode.position,theta);

                //var associationVector = __sphericalPosition(associationRange,theta,phi);;
                var associationVector = __randomSphereVector(associationRange);
                //todo: check current connections and calculate relative position between all associated nodes.
                if (!linkedNode.isClustered && !connection.isConnected())
                {
                    linkedNode.isClustered = true;

                    var startVector = node.targetVector.clone();//node.position.clone();
                    linkedNode.targetVector.addVectors(node.targetVector.clone(),associationVector);
                    //node.targetVector.add(associationVector);

                    //TweenMax.set(linkedNode.position,{x:node.position.x+associationVector.x,y:node.position.y+associationVector.y,z:node.position.z+associationVector.z})
                    //TweenMax.from(linkedNode.position,1.0,{delay:0.4,ease:Quad.easeInOut,x:0,y:0,z:0,onUpdate:__onNodeMove,onUpdateParams:[linkNodeData]});
                    node.motionTween = TweenMax.to(linkedNode.position,1.0,{delay:0.4,ease:Quad.easeInOut,x:linkedNode.targetVector.x,y:linkedNode.targetVector.y,z:linkedNode.targetVector.z,onUpdate:__onNodeMove,onUpdateParams:[linkNodeData]});
                    
                    //node.motionTween = TweenMax.from(linkedNode.position,4.0,{delay:0.4,ease:Quad.easeOut,x:startVector.x,y:startVector.y,z:startVector.z,onUpdate:__onNodeMove,onUpdateParams:[linkNodeData]});
                    
                }
            }
        }

        function displayConnection(connection,ribbons)
        {
            var nodeData = _nodeDataManager.getNodeByID(connection.getInitialNode())
            var node = nodeData.getVisualNode();
            var connectNodeData = _nodeDataManager.getNodeByID(connection.getConnectionNode())
            var connectNode = connectNodeData.getVisualNode();

            var associationRange = (1-connection.getWeight()+1)*800 + 20;
            var associationVector = __randomSphereVector(associationRange);
            if (!connection.isConnected() && !connectNodeData.checkConnection(nodeData.getID()))
            {
                connection.isConnected(true);
                //TweenMax.to(connectNode.position,1,{ease:Quad.easeInOut,x:node.position.x+associationVector.x,y:node.position.y+associationVector.y,z:node.position.z+associationVector.z,onUpdate:__onNodeMove,onUpdateParams:[connectNodeData]});
            }
            TweenMax.delayedCall(1,__linkNodes,[connection,ribbons,node,connectNode,12]);
                
        }

        function highlightConnection(connection)
        {
            __vibrateConnectionNerve(connection);
        }

        function clusterNodes(nodes)
        {
            var i=0;
            var limit = nodes.length;
            for(i=0;i<limit;++i)
            {
                TweenMax.delayedCall(i/(limit/10),clusterNode,[nodes[i]]);
            }
        }

        function connectAllNodes(nodes)
        {
            var i=0;
            var limit = nodes.length;
            for(i=0;i<limit;++i)
            {
                if (nodes[i].getVisualNode() !== undefined)
                {
                    TweenMax.delayedCall(i/(limit/100),connectNode,[nodes[i],false]);
                }
                //var color = nodes[i].connections
                //connectNode(nodes[i],'#343434')
                //console.log(nodes[i])
                //addNodeToStage(nodes[i]);
            }
        }



        function moveCameraTargetToNode(id)
        {
            var node = _nodeDataManager.getNodeByID(id).getVisualNode();
            TweenMax.to([_cameraTarget.position,_light.position],2,{x:node.position.x,y:node.position.y,z:node.position.z,ease:Quad.easeInOut})
        }

        function spinCamera(speed)
        {
            var origin = _activeNode.position.clone();
            console.log(origin);
            var vect = origin.add(__randomSphereVector(_cameraZoom));
            console.log(vect);
            TweenMax.to([_camera.position,_cameraLight.position],speed,{delay:1,z:vect.z,y:vect.y,x:vect.x, ease:Quad.easeOut})
        }


        function zoomCamera(zoomAmount, speed)
        {
            _cameraZoom += zoomAmount;
            console.log('++++++++++++++++++++++++');
            console.log(app);
            //TweenMax.to(this,speed,{_cameraZoom:'+='+zoomAmount})
            TweenMax.to([_camera.position,_cameraLight.position],speed,{delay:0, z:'+='+zoomAmount, ease:Quad.easeIn})
        }

        //////////////
        ///////  Full Network public facing functions

        function revealNetwork(zoom,speed)
        {
            setFogLevel(0.00006,speed*0.75);//TweenMax.to(_scene.fog,10,{density:0.00016})
            _cameraZoom = zoom;
            //TweenMax.to(this,speed,{_cameraZoom:zoom})
            TweenMax.to([_camera.position,_cameraLight.position],speed,{delay:0, z:zoom, ease:Quad.easeIn})

            //TweenMax.to(_scene.fog,10,{density:0,repeat:-1,yoyo:true});
        }

        function setFogLevel(value,speed)
        {
            if (speed === undefined) speed = 4
            TweenMax.to(_scene.fog,speed,{density:value});
        }


        /////////////////////////
        // EVENT HANDLERS
        /////////////////////////

        function __onCameraTargetMove()
        {
            //console.log(_cameraTarget.position);
        }

        function __onCameraMoveComplete()
        {
            _cameraTrackActive = false;
            _centralLight.position.set(_camera.position.x,_camera.position.y,_camera.position.z);
            console.log(_centralLight.position);
            var bezPath = [
            {x:_camera.position.x + (Math.random()*200-100), y:_camera.position.y + (Math.random()*200-100), z:_camera.position.z + (Math.random()*200-100)},
            {x:_camera.position.x + (Math.random()*200-100), y:_camera.position.y + (Math.random()*200-100), z:_camera.position.z + (Math.random()*200-100)},
            {x:_camera.position.x + (Math.random()*200-100), y:_camera.position.y + (Math.random()*200-100), z:_camera.position.z + (Math.random()*200-100)},
            {x:_camera.position.x + (Math.random()*200-100), y:_camera.position.y + (Math.random()*200-100), z:_camera.position.z + (Math.random()*200-100)}];
            var bezier = {curviness:4.25, values:bezPath.concat([{x:_centralLight.position.x, y:_centralLight.position.y, z:_centralLight.position.z}]), autoRotate:false};
            //console.log(_centralLight);
            _centralLightTween.updateTo({bezier:bezier,x:_camera.position.z,y:_camera.position.y,z:_camera.position.z,repeat:-1,yoyo:true},true);
            //TweenMax.to(_centralLight.position,10,{x:0,y:0,z:0,bezier:bezier,repeat:-1})
        }

        function __onFlagGeometryForUpdate(geom) {
            if (geom.length != undefined)
            {
                var i=0;
                var limit = geom.length;
                for(i=0;i<limit;++i)
                {
                    geom[i].verticesNeedUpdate = true;
                }
            }
            else
            {
                geom.verticesNeedUpdate = true;
            }
        }

        function __onDocumentClick(evt)
        {
          //_counter = undefined;
        }


        function __onDocumentMouseWheel(evt) 
        {
          var d = evt.originalEvent.wheelDelta/5;
          _cameraZoom -= d;
          var theta = _mouseDeltaX/100 * 2 * Math.PI;
          var tZ = _cameraTarget.position.z + _cameraZoom * Math.cos(theta);
          //_camera.position.z = tZ;
          TweenMax.to([_camera.position,_cameraLight.position],.2,{z:tZ});
        };

        function __onDocumentMouseMove(evt) {
           _mouse.x = ( evt.clientX / window.innerWidth ) * 2 - 1;
            _mouse.y = - ( evt.clientY / window.innerHeight ) * 2 + 1;
           // TweenMax.to(local.nodesArr[local.rndSystem].rotation,1,{y:xSign * local.mouseX/180*Math.PI,x:ySign * local.mouseY/180*Math.PI});
           if (_cameraTrackActive === false)
           {
            if (_mouseIsDown)
            {
                _mouseDeltaX += (evt.clientX - _mouseStartX)*0.00001;
                _mouseDeltaY += (evt.clientY - _mouseStartY)*0.00001;
                var theta = _mouseDeltaX * 2 * Math.PI;
                var phi = _mouseDeltaY* Math.PI;   
                var tX = _cameraTarget.position.x + _cameraZoom * Math.sin(theta)*Math.cos(phi);//  
                var tY = _cameraTarget.position.y + _cameraZoom * Math.sin(theta)*Math.sin(phi);//    
                var tZ = _cameraTarget.position.z + _cameraZoom * Math.cos(theta);
                TweenMax.to([_camera.position,_cameraLight.position],.2,{x:tX,y:tY,z:tZ});
            }
            else
            {
                //var mouseX = (evt.clientX - _wHalfX)*0.05;
                //var mouseY = -(evt.clientY - _wHalfY)*0.05;
                //TweenMax.to(_camera.position,.2,{x:_cameraLight.position.x+mouseX,y:_cameraLight.position.y+mouseY,z:_cameraLight.position.z});
            }
                //console.log(_mouseStartX,_mouseStartY,_mouseDeltaX,_mouseDeltaY)
             //TweenMax.to(_light,.2,{position:_cameraTarget.position});
           }

        };


        function __onNodeMove(nodeData)
        {
            var connections = nodeData.getConnections();
            //var connections = connections.concat(nodeData.getIncomingConnections());
            var i=0;
            var limit = connections.length;
            var node = nodeData.getVisualNode();

            node.updateMatrixWorld();
            for (i=0;i<limit;++i)
            {
                //connections[i]
                connection = connections[i];
                //console.log(connection);
                if(connection.getVisualConnection() !== undefined)
                {
                    var connectedNodeData = _nodeDataManager.getNodeByID(connection.getConnectionNode())
                    var connectedNode = connectedNodeData.getVisualNode();
                    connectedNode.updateMatrixWorld();
                    var connectionPointWorld = connectedNode.parent.localToWorld(connectedNode.position.clone());
                    var connectionLocal = node.worldToLocal(connectionPointWorld.clone());
                    console.log()
                    __updateConnectionNerve(connection,node.coreSize,new THREE.Vector3(0,0,0),connectionLocal);
                    //__updateConnection(connection,new THREE.Vector3(0,0,0),connectionLocal);
                    //__updateConnectionLine(connection,new THREE.Vector3(0,0,0),connectionLocal);
                }
            }
            var inConnections = nodeData.getIncomingConnections();
            var limit = inConnections.length;
            for (i=0;i<limit;++i)
            {
                inConnection = inConnections[i];
                var inNode = _nodeDataManager.getNodeByID(inConnection.getInitialNode()).getVisualNode()
                if(inNode !== undefined && inConnection.getVisualConnection() !== undefined)
                {
                    var connectedNodeData = _nodeDataManager.getNodeByID(inConnection.getConnectionNode())
                    var connectedNode = connectedNodeData.getVisualNode();
                    //console.log(node,connectedNode);
                    //console.log('-------')
                    connectedNode.updateMatrixWorld();
                    var connectionPointWorld = connectedNode.parent.localToWorld(connectedNode.position.clone());
                    var connectionLocal = inNode.worldToLocal(connectionPointWorld.clone());
                    __updateConnectionNerve(inConnection,node.coreSize,new THREE.Vector3(0,0,0),connectionLocal);
                    //__updateConnection(inConnection,new THREE.Vector3(0,0,0),connectionLocal);
                    //__updateConnectionLine(inConnection,new THREE.Vector3(0,0,0),connectionLocal);
                }
            }
        }


        function __onRollOverAttribute(nodeData)
        {
            var attrData = nodeData;
            while (attrData.getDataType() == 'Attribute')
            {
                var node = attrData.getVisualNode();
                node.innerCore.material.color.setHex(_colorManager.getAttributeHighlightColor());
                node.connection.material.color.setHex(_colorManager.getAttributeHighlightColor());
                attrData = attrData.getParent();
            }
            _scope.$broadcast(ATTRIBUTE_ROLL_OVER,nodeData);
        }

        function __onRollOutAttribute(nodeData)
        {
            var attrData = nodeData;
            while (attrData.getDataType() == 'Attribute')
            {
                var node = attrData.getVisualNode();
                node.innerCore.material.color.setHex(_colorManager.getAttributeColor());
                node.connection.material.color.setHex(_colorManager.getAttributeConnectionColor());
                attrData = attrData.getParent();
            }
            _scope.$broadcast(ATTRIBUTE_ROLL_OVER,nodeData);
        }


        function __onSelectAttribute(nodeData)
        {
            _scope.$broadcast(ATTRIBUTE_SELECTED,nodeData);
        }



        function __onMouseDown(evt) {
            _mouseStartX = evt.clientX;
            _mouseStartY = evt.clientY;
            _mouseIsDown = true;


            console.log("Click.");
    
            // update the mouse variable
            _mouse.x = ( evt.clientX / window.innerWidth ) * 2 - 1;
            _mouse.y = - ( evt.clientY / window.innerHeight ) * 2 + 1;
            
            __checkForIntersections('click');

            
        }

        function __onMouseUp(evt) {
            _mouseIsDown = false;
        }




        function __onNeuronLightUpdate()
        {
            //console.log('update')
        }

        function __onNeuronLightMoved(neuronLightID)
        {
            var tween = _neuronLightTweens[neuronLightID];
            //console.log(_neuronLightTweens[neuronLightID]);
            //_neuronLightTweens[neuronLightID].time(0);
            var time = Math.random()*10+10;
            tween.duration(time);
            //tween.totalDuration(time+1);

            tween.updateTo({x:Math.random()*4000-2000,y:Math.random()*4000-2000,z:Math.random()*4000-2000},true);
            tween.time(0);
            //tween.updateTo({x:Math.random()*4000-2000,y:Math.random()*4000-2000,z:Math.random()*4000-2000}, true);
            //tween.updateTo({x:Math.random()*4000-2000,y:Math.random()*4000-2000,z:Math.random()*4000-2000},true);
        }




        function __onWindowResize(evt) {
          _wHalfX = window.innerWidth / 2;
          _wHalfY = window.innerHeight / 2;

          _camera.aspect = window.innerWidth / window.innerHeight;
          _camera.updateProjectionMatrix();
          _renderer.setSize( window.innerWidth, window.innerHeight );
          //local.render();  
        };



        /////////////////////////
        //   GETTERS & SETTERS
        //////////////////////////




        //////////////////////////////////
        //   PRIVATE FUNCTIONS
        /////////////////////////////////

        /**
         * __createTextSprint creates a HTML5 canvas element and draws
         * a box with text inside.
         * @param String message the text to display.
         * @param Object Configuration parameters to style the rectangle.
         * @return THREE.sprite to be composited to the scene.
         */
        function __createTextSprite( message, parameters ) {
            if ( parameters === undefined ) parameters = {};
            var fontface = parameters.hasOwnProperty("fontface") ? 
                parameters["fontface"] : "Helvetica";
            var fontsize = parameters.hasOwnProperty("fontsize") ? 
                parameters["fontsize"] : 18;
            var borderThickness = parameters.hasOwnProperty("borderThickness") ? 
                parameters["borderThickness"] : 1;
            var borderColor = parameters.hasOwnProperty("borderColor") ?
                parameters["borderColor"] : { r:0, g:0, b:0, a:1.0 };
            var backgroundColor = parameters.hasOwnProperty("backgroundColor") ?
                parameters["backgroundColor"] : { r:255, g:255, b:255, a:1.0 };
            var spriteAlignment = {
                x: 1,
                y: -1
            }
            var canvas = document.createElement('canvas');
            var context = canvas.getContext('2d');
            context.font = "Bold " + fontsize + "px " + fontface;
            // get size data (height depends only on font size)
            var metrics = context.measureText( message );
            var textWidth = metrics.width;
            // background color
            context.fillStyle   = "rgba(" + backgroundColor.r + "," + backgroundColor.g + ","
                                          + backgroundColor.b + "," + backgroundColor.a + ")";
            // border color
            context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + ","
                                          + borderColor.b + "," + borderColor.a + ")";

            context.lineWidth = borderThickness;
            __canvasDrawRect(context,
                borderThickness/2,
                borderThickness/2,
                textWidth + borderThickness,
                fontsize * 1.4 + borderThickness,
                0
            );
            // 1.4 is extra height factor for text below baseline: g,j,p,q.

            // text color
            context.fillStyle = "rgba(0, 0, 0, 1.0)";

            context.fillText( message, borderThickness, fontsize + borderThickness);

            // canvas contents will be used for a texture
            var texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;

            var spriteMaterial = new THREE.SpriteMaterial( {
                map: texture,
                useScreenCoordinates: false,
                alignment: spriteAlignment
            } );
            var sprite = new THREE.Sprite( spriteMaterial );
            sprite.scale.set(100,50,1.0);
            return sprite;
        }

        /** __canvasDrawRect draws a rectangle on a canvas element.
         *
         * @param ctx HTML5 Canvas context.
         * @param Number x starting x postion.
         * @param Number y starting y postion.
         * @param Number w rectange width.
         * @param Number h rectangle height.
         * @param Number r corner radius.
         * @return Modifies the canvas ctx by reference.
         */
        function __canvasDrawRect(ctx, x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x+r, y);
            ctx.lineTo(x+w-r, y);
            ctx.quadraticCurveTo(x+w, y, x+w, y+r);
            ctx.lineTo(x+w, y+h-r);
            ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
            ctx.lineTo(x+r, y+h);
            ctx.quadraticCurveTo(x, y+h, x, y+h-r);
            ctx.lineTo(x, y+r);
            ctx.quadraticCurveTo(x, y, x+r, y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }



        /// Helper color functions can be moved to external class.
        function __rgbToHex(R,G,B) {
          return __toHex(R)+__toHex(G)+__toHex(B);
        }

        function __toHex(n) {
          n = parseInt(n,10);
          if (isNaN(n)) return "00";
          n = Math.max(0,Math.min(n,255));
          return "0123456789ABCDEF".charAt((n-n%16)/16)
              + "0123456789ABCDEF".charAt(n%16);
        }


        function __randomSphereVector(range)
        {
            var theta = Math.random()*2*Math.PI;
            var phi = Math.random()*Math.PI;
            var destX =  range*Math.sin(theta)*Math.cos(phi);//  
            var destY =  range*Math.sin(theta)*Math.sin(phi);// 
            var destZ =  range*Math.cos(theta);
            return new THREE.Vector3(destX,destY,destZ)
        }

        function __sphericalPosition(range,theta,phi)
        {
            var destX =  range*Math.sin(theta)*Math.cos(phi);//  
            var destY =  range*Math.sin(theta)*Math.sin(phi);// 
            var destZ =  range*Math.cos(theta);
            //console.log(range,theta,phi)
            return new THREE.Vector3(destX,destY,destZ)
        }

        /*function __calcTheta(vec1,vec2)
        {
            //var theta = Math.acos((vec2.z - vec1.z));
            var axis = new THREE.Vector3();
            axis.subVectors(vec2,vec1);
            axis.normalize();
            var theta = Math.acos(axis.y);
            //console.log(vec2.z,vec1.z,theta);
            return theta;
        }

        function __calcPhi(vec1,vec2,theta)
        {
            var axis = new THREE.Vector3();
            axis.subVectors(vec2,vec1);
            axis.normalize();
            var phi = Math.acos((axis.x)/Math.sin(theta));
            return phi;
        }
*/
        




        /////////////////////////
        //  Collision Detection



        function __checkForIntersections(action)
        {

            // find intersections

            // create a Ray with origin at the mouse position
            //   and direction into the scene (camera direction)
            var vector = new THREE.Vector3( _mouse.x, _mouse.y, 1 );
            _projector.unprojectVector( vector, _camera );
            var ray = new THREE.Raycaster( _camera.position, vector.sub( _camera.position ).normalize() );

            // create an array containing all objects in the scene with which the ray intersects
            var intersects = ray.intersectObjects( _targetList );
            //console.log(_targetList);
            // if there is one (or more) intersections
            if ( intersects.length > 0 )
            {

                //if (action == '')
                //console.log(intersects)
                var first = intersects[0];
                
                if(first.object.parent.nodeData !== undefined)
                {
                    if (_mouseOverObject !== undefined  && _mouseOverObject !== intersects[0])
                    {
                        __onRollOutAttribute(_mouseOverObject.object.parent.nodeData)
                    }
                    if(first.object.parent.nodeData.getDataType() == 'Attribute')
                    {
                        if(action == 'click')
                        {   
                            __onSelectAttribute(first.object.parent.nodeData);
                        }
                        else
                        {
                            _mouseOverObject = first;
                            __onRollOverAttribute(first.object.parent.nodeData);
                        }
                        
                    }
                    
                }
                else
                {
                    console.log('none node selection');
                    console.log(intersects[0]);
                }
                
                // change the color of the closest face.
                //intersects[ 0 ].face.color.setRGB( 0.8 * Math.random() + 0.2, 0, 0 ); 
                //intersects[ 0 ].object.geometry.colorsNeedUpdate = true;
            }
            else
            {
                if (_mouseOverObject !== undefined)
                {
                    __onRollOutAttribute(_mouseOverObject.object.parent.nodeData)
                }
                _mouseOverObject = undefined;
            }
        }





        /////////////////////////
        // node initialization



        function __initializeNodeTextures()
        {

            _attrParticleMat = new THREE.PointCloudMaterial({
                color: _colorManager.getAttributeColor(),//nodeData.baseColor,
                size: 10, 
                map: THREE.ImageUtils.loadTexture('assets/images/theme-' + window.nara.theme + '/attribute-cloud.png'),
                depthWrite:false,
                blending:THREE.AdditiveBlending,
                transparent:true
            });


            _attributeTextureMat = new THREE.MeshBasicMaterial( { map: THREE.ImageUtils.loadTexture('assets/images/theme-' + window.nara.theme + '/attribute-cloud-glow.png'),
                //opacity:0.7,
                transparent:true,
                side:THREE.FrontSide,
                shading:THREE.FlatShading,
                //ambient: 0xffffff,
                //specular:0x6699ff,
                //shininess: 3,
                vertexColors: false
            });

            _nodePartMat = new THREE.PointCloudMaterial({
                color: _colorManager.getNodeParticleBaseColor(),//nodeData.baseColor,
                size: 350,
                map: THREE.ImageUtils.loadTexture('assets/images/theme-' + window.nara.theme + '/node-1.png'),
                depthWrite:false,
                side:THREE.DoubleSide,
                //blending:THREE.AdditiveBlending,
                transparent:true
            });

            _distantNodePartMat = new THREE.PointCloudMaterial({
                color: _colorManager.getNodeParticleBaseColor(),//nodeData.baseColor,
                size: 200, 
                map: THREE.ImageUtils.loadTexture('assets/images/theme-' + window.nara.theme + '/node-1.png'),
                depthWrite:false,
                side:THREE.DoubleSide,
                //blending:THREE.AdditiveBlending,
                transparent:true
            });

            _ribbonMat = new THREE.MeshBasicMaterial( {
                map: THREE.ImageUtils.loadTexture('assets/images/theme-' + window.nara.theme + '/connection.png') ,
                transparent:true,
                side:THREE.DoubleSide,
                depthTest:true,
                // fog:false,
                blending:THREE.AdditiveBlending,
                vertexColors: false
            } );

            _attributeRibbonMat = new THREE.MeshBasicMaterial( { map: THREE.ImageUtils.loadTexture('assets/images/theme-' + window.nara.theme + '/attribute-connection-pattern.png') ,
                transparent:true,
                side:THREE.DoubleSide,
                //fog:false,
                blending:THREE.AdditiveBlending,
                vertexColors: false
            } );

            _nodeTextureMat = new THREE.MeshPhongMaterial( {
                map: THREE.ImageUtils.loadTexture('assets/images/GridGradientPattern.jpg'),
                transparent:true,
                color:_colorManager.getEntityNodeBaseColor(),
                shading:THREE.FlatShading,
                //blending:THREE.AdditiveBlending,
                side:THREE.FrontSide,
                ambient: _colorManager.getEntityNodeAmbientColor(),
                specular:_colorManager.getEntityNodeSpecularColor(),
                shininess: _colorManager.getEntityNodeShineValue(),
                vertexColors: false
            });

            _entityNodeMat = new THREE.MeshPhongMaterial( { 
                //map: THREE.ImageUtils.loadTexture('assets/images/noise.jpg'),
                transparent:true,
                color:_colorManager.getEntityNodeBaseColor(),
                shading:THREE.SmoothShading,
                opacity:0.7,
                //blending:THREE.AdditiveBlending,
                side:THREE.FrontSide,
                ambient: _colorManager.getEntityNodeAmbientColor(),
                specular:_colorManager.getEntityNodeSpecularColor(),
                shininess: _colorManager.getEntityNodeShineValue(),
                vertexColors: false
            });

            _userNodeMat = new THREE.MeshPhongMaterial( { 
                //map: THREE.ImageUtils.loadTexture('assets/images/noise.jpg'),
                transparent:true,
                color:_colorManager.getUserNodeBaseColor(),
                shading:THREE.SmoothShading,
                //blending:THREE.AdditiveBlending,
                side:THREE.FrontSide,
                ambient: _colorManager.getUserNodeAmbientColor(),
                specular:_colorManager.getUserNodeSpecularColor(),
                shininess: _colorManager.getUserNodeShineValue(),
                vertexColors: false
            });


            _textureUvs = [];
            var i=0;
            var limit = 3;//Math.random()*21+1;
            for (i=0;i<limit;++i)
            {
                var ySpacing = 1/limit;
                var yOffset = ySpacing * i;
                var n=0;
                var nLimit=2;//Math.random()*34+1;
                for (n=0;n<nLimit;++n)
                {
                    var xSpacing = 1/nLimit;
                    var xOffset = xSpacing * n;
                    var textureUV = [new THREE.Vector2(xOffset, yOffset), new THREE.Vector2(xSpacing+xOffset, yOffset), new THREE.Vector2(xSpacing+xOffset, ySpacing+yOffset), new THREE.Vector2(xOffset, ySpacing+yOffset)];
                    _textureUvs.push(textureUV);
                }
            }

            _attrGlowMat = new THREE.ShaderMaterial( 
            {
                uniforms:
                {
                    "c":   { type: "f", value: 0.0 },
                    "p":   { type: "f", value: 5.5 },
                    glowColor: { type: "c", value: new THREE.Color(_colorManager.getAttributeGlowColor()) },
                    viewVector: { type: "v3", value: _camera.position }
                },
                vertexShader:   document.getElementById( 'vertexShader'   ).textContent,
                fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
                side: THREE.FrontSide,
                blending: THREE.AdditiveBlending,
                transparent: true
            });

            _nodeGlowMat = new THREE.ShaderMaterial(
            {
                uniforms:
                {
                    "c":   { type: "f", value: 0.2 },
                    "p":   { type: "f", value: 6.0 },
                    glowColor: { type: "c", value: new THREE.Color(_colorManager.getEntityNodeGlowColor()) },
                    viewVector: { type: "v3", value: _camera.position }
                },
                vertexShader:   document.getElementById( 'vertexShader'   ).textContent,
                fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
                side: THREE.FrontSide,
                fog:false,
                blending: THREE.AdditiveBlending,
                transparent: true
            });

            _ribbonGlowMat = new THREE.ShaderMaterial( 
            {
                uniforms: 
                { 
                    "c":   { type: "f", value: 0 },
                    "p":   { type: "f", value: 5 },
                    glowColor: { type: "c", value: new THREE.Color(_colorManager.getConnectionSparkGlowColor()) },
                    viewVector: { type: "v3", value: _camera.position }
                },
                vertexShader:   document.getElementById( 'vertexShader'   ).textContent,
                fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
                //side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                transparent: true
            });


            _particleShaderMaterial = new THREE.ShaderMaterial( {
                uniforms:       {
                    color: { type: "c", value: new THREE.Color( 0xffffff ) },
                    spriteWidth: { type: "f", value: 90.0},
                    screenWidth: { type: "f", value: 1000.0},
                    texture: { type: "t", value: null },
                    texture_point: { type: "t", value: THREE.ImageUtils.loadTexture('assets/images/theme-' + window.nara.theme + '/node-sphere.png') },
                    fogColor:{ type: "c", value: _scene.fog.color},
                    fogDensity:{ type: "f", value: _scene.fog.density}
                    //texture: {type: "c", value:THREE.ImageUtils.loadTexture("assets/images/NodeSphere.png")}
                },
                attributes:     {
                    alpha: { type: 'f', value: [] },
                    aPoints: { type: 'v2', value: [new THREE.Vector2()] }

                },
                vertexShader:   document.getElementById( 'particleVertexShader' ).textContent,
                fragmentShader: document.getElementById( 'particleFragmentShader' ).textContent,
                depthWrite:false,
                blending:THREE.AdditiveBlending,
                wireframe:true,
                transparent:true
            });


            _ribbonUvs = [];
            var i=0;
            var limit = 2;//Math.random()*21+1;
            for (i=0;i<limit;++i)
            {
                var ySpacing = 1/limit;
                var yOffset = ySpacing * i;
                var n=0;
                var nLimit=10;//Math.random()*34+1;
                for (n=0;n<nLimit;++n)
                {
                    var xSpacing = 1/nLimit;
                    var xOffset = xSpacing * n;
                    var ribbonUV = [new THREE.Vector2(xOffset, yOffset), new THREE.Vector2(xSpacing+xOffset, yOffset), new THREE.Vector2(xSpacing+xOffset, ySpacing+yOffset), new THREE.Vector2(xOffset, ySpacing+yOffset)];
                    _ribbonUvs.push(ribbonUV);
                }
            }

            _baseRibbonConnectionMat = __generateRibbonMaterial('#aaaaff');

            _lineConnectionMats = {};

            _lineConnectionMats['attr'] = _attributeConnectionMat = __generateLineMaterial('#789878',true,1.0);

            _lineConnectionMats[1] = __generateLineMaterial(_colorManager.getSimpleConnectionColor(),true,0.6);
            _lineConnectionMats[2] = __generateLineMaterial(_colorManager.getPulseConnectionColor(),true,0.6);

            _ribbonConnectionMats = {};
            _ribbonConnectionMats[1] = _positiveHighConnectionMeshMat = _ribbonMat;

        }

        ////////////////////
        //  material generation functions

        function __generateLineMaterial(color,additive,opacity) {
          color = (color === undefined) ? '#aaaaff' : color;
          var material = new THREE.LineBasicMaterial({
            color: color,//'#aaaaff',//+Math.floor(Math.random()*16777215*0.5).toString(16), 
            linecap: 'round',
            linejoin: 'round',
            opacity:opacity,
            fog:true,
            //blending: ((additive) ? THREE.AdditiveBlending : THREE.NormalBlending),
            transparent: true
          });
          return material;
        };


        function __generateRibbonMaterial(color)
        {
            color = (color === undefined) ? '#aaaaff' : color;
            var material = new THREE.MeshBasicMaterial({
                color: color,//'#aaaaff',//+Math.floor(Math.random()*16777215*0.5).toString(16), 
                //wireframe:true,
                opacity: 0.3,
                blending:THREE.AdditiveBlending,
                side:THREE.DoubleSide,
                transparent: true
            });
            return material;
        }

        function __generateSphereMaterial(wireframe,variation,backFacing) {

            if (backFacing === undefined) backFacing = true;
            var material = new THREE.MeshPhongMaterial({ 
                shading: THREE.NormalShading,
                opacity:0.02,
                wireframe:wireframe,
                blending: (wireframe) ? THREE.AdditiveBlending : THREE.AdditiveBlending,
                transparent: true,
                side:(backFacing) ? THREE.BackSide : THREE.FrontSide
            });
            if (variation)
            {
                material.vertexColors = THREE.FaceColors;
            //
            }
            else
            {
                //material.color = '#'+Math.floor(Math.random()*16777215).toString(16);
            }
            //local.materials.push(material);
            return material;
        };



        ////////////////
        //node helper functions

        function __alignNodeAttributes(node,range,delay,speed)
        {
            //var node = nodeData.getVisualNode();
            if (speed === undefined) speed = 1
            var attributesCloud = node.attributesCloud;
            var verts = attributesCloud.geometry.vertices;
            var i=0;
            var limit = verts.length;

            for (i=0;i<limit;++i)
            {
                var initDelay = delay;
                var vertex = verts[i];
                //console.log(vertex);
                var theta = Math.sin(i/(limit-1))*2*Math.PI;
                var phi = Math.cos(i/(limit-1))*Math.PI;

                var destX =  0*Math.cos(theta);//*Math.cos(phi);//  
                var destY =  0*Math.sin(theta);//*Math.sin(phi);// 
                var destZ =  0;//range*Math.cos(theta); 

                //vertex.x = initX;
                //vertex.y = initY;
                //vertex.z = initZ;
                if (i<2) initDelay = 0;

                var tween = TweenMax.to(vertex,speed,{ease:Quad.easeOut,x:destX,y:destY,z:destZ,delay:initDelay*i,onUpdate:__onFlagGeometryForUpdate,onUpdateParams:[attributesCloud.geometry]});
                //console.log(tween);
            }
            attributesCloud.geometry.verticesNeedUpdate = true;
        }

        function __scatterNodeAttributes(node,range)
        {
            //var node = nodeData.getVisualNode();
            var attributesCloud = node.attributesCloud;
            var verts = attributesCloud.geometry.vertices;
            var i=0;
            var limit = verts.length;
            for (i=0;i<limit;++i)
            {

                var vertex = verts[i];
                //console.log(vertex);
                var theta = Math.random()*2*Math.PI;
                var phi = Math.random()*Math.PI;
                var range = range;
                var destX =  range*Math.sin(theta)*Math.cos(phi);//  
                var destY =  range*Math.sin(theta)*Math.sin(phi);// 
                var destZ =  range*Math.cos(theta);
                var tween = TweenMax.to(vertex,1,{x:destX,y:destY,z:destZ,onUpdate:__onFlagGeometryForUpdate,onUpdateParams:[attributesCloud.geometry]});
            }
            attributesCloud.geometry.verticesNeedUpdate = true;
        }

        
        function __calcPhi(vec1,vec2)
        {
            var phi = Math.atan((vec1.y-vec2.y)/(vec1.x-vec2.x))
            return phi;
        }

        function __calcTheta(vec1,vec2)
        {
            var xD = vec1.x - vec2.x;
            var yD = vec1.y - vec2.y;
            var zD = vec1.z - vec2.z;
            var theta = Math.acos(zD/(Math.sqrt(xD+yD+zD)));
            return theta;
        }
        /////////////////////
        //  linking functions


        function __linkAttributes(connectionData,ribbons,node1,node2,signalStrength)
        {
            var weight;
            // refactor into two seperate functions for attributes and nodes.
            if (connectionData === null)
            {
                weight = 0;//'attr'
            }
            else
            {
                weight = connectionData.getWeight();
            }
            var connectNode = node2;
            connectNode.parent.updateMatrixWorld();
            connectNode.updateMatrixWorld();
            node1.updateMatrixWorld();
            var container = node1.parent;
            container.updateMatrixWorld();

            var connectionPointWorld = connectNode.parent.localToWorld(connectNode.position.clone());
            var connectionLocal = node1.worldToLocal(connectionPointWorld.clone());
            connectionLocal.x += 0;
            if (ribbons)
            {
                var theta = __calcTheta(node1.position,node2.position);
                var phi = __calcPhi(node1.position,node2.position);
                var startVector = __sphericalPosition(node1.coreSize,theta,phi);
                var connection = __generateAttributeNerve(node2.coreSize,startVector,connectionLocal,true,signalStrength);
                node1.add(connection);
                node1.updateMatrixWorld();
                connection.updateMatrixWorld();
            }
            else
            {
                var connection = __generateConnectionLine(weight,new THREE.Vector3(0,0,0),connectionLocal);
                node1.add(connection);
            }
            if(connectionData !== null) connectionData.setVisualConnection(connection);
            return connection;
        }

        function __linkNodes(connectionData,ribbons,node1,node2,signalStrength)
        {
            var weight;
            // refactor into two seperate functions for attributes and nodes.
            if (connectionData === null)
            {
                weight = 0;//'attr'
            }
            else
            {
                weight = connectionData.getWeight();
            }
            var connectNode = node2;
            connectNode.parent.updateMatrixWorld();
            connectNode.updateMatrixWorld();
            node1.updateMatrixWorld();
            var container = node1.parent;
            container.updateMatrixWorld();

            var connectionPointWorld = connectNode.parent.localToWorld(connectNode.position.clone());
            var connectionLocal = node1.worldToLocal(connectionPointWorld.clone());
            if (ribbons)
            {
                //var connection = __generateConnectionRibbon(weight,new THREE.Vector3(0,0,0),connectionLocal,true,signalStrength);
                var connection = __generateConnectionNerve(node1.coreSize,new THREE.Vector3(0,0,0),connectionLocal,true,signalStrength);
                node1.add(connection);
                var connection2 = __generateConnectionPulse(node1.coreSize,new THREE.Vector3(0,0,0),connectionLocal,true,signalStrength);
                node1.add(connection2);
                //var connection2 = __generateConnectionLightning(weight,new THREE.Vector3(0,0,0),connectionLocal,true,signalStrength);
                //node1.add(connection2);
                
                node1.updateMatrixWorld();
                connection.updateMatrixWorld();
            }
            else
            {
                var connection = __generateConnectionLine(weight,new THREE.Vector3(0,0,0),connectionLocal);
                node1.add(connection);
                //var connection2 = __generateConnectionPulse(weight,new THREE.Vector3(0,0,0),connectionLocal);
                //node1.add(connection2);
            }
            if(connectionData !== null) connectionData.setVisualConnection(connection);

           // console.log(node2.nodeData);
            linkedConnection = node2.nodeData.addIncomingConnection(node1.nodeData.getID(),connectionData.getWeight());
            linkedConnection.setVisualConnection(connection);
            /// locate second node add incoming connection and set its visual node to this connection.
            //cNode.addIncomingConnection(cData.getInitialNode(),cData.getWeight());
            return connection;
        }

        function __generateConnectionLine(weight,v1,v2)
        {
          var connectGeom = new THREE.Geometry();
          var connectMat = _lineConnectionMats[1];//weight];//_positiveHighConnectionMat;//_baseLineConnectionMat;//
          if(connectMat == undefined) console.log(weight);
          var originP = v1;
          var connectionP = v2; 

          connectGeom.vertices.push(originP);
          var i=0;
          var dist = v1.distanceTo(v2);
          var xDist = (v2.x - v1.x);
          var yDist = (v2.y - v1.y);
          var zDist = (v2.z - v1.z);
          var limit = Math.ceil(dist/30);//+100;
          var vectorOffset = new THREE.Vector3(0,0,0);
          var prevVector = new THREE.Vector3(0,0,0);
          for (i=0;i<=limit;++i)
          {
            var vect = new THREE.Vector3();
            var spread = limit;
            
            var avgDist = (Math.abs(xDist) + Math.abs(yDist) + Math.abs(zDist))/3
            var minDist = Math.min(xDist,yDist,zDist);

            //vectorOffset.add(new THREE.Vector3((Math.random()-0.5)*dist/100,(Math.random()-0.5)*dist/100,(Math.random()-0.5)*dist/100))
            vectorOffset = (new THREE.Vector3((Math.sin(i/limit*Math.PI*2)),(Math.cos(i/limit*Math.PI*2)),(Math.sin(i/limit*Math.PI*2))));
            
             //vect.x = ((xDist/limit)*i) + (vectorOffset.x) *((spread>>1)-(Math.abs((spread>>1)-i))) + Math.random()-0.5;// *dist/30;// + Math.sin(i/100)*10;//(i/10)*(dist/300) + Math.sin(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
             //vect.y = ((yDist/limit)*i) + (vectorOffset.y) *((spread>>1)-(Math.abs((spread>>1)-i))) + Math.random()-0.5;// *dist/30;// + Math.cos(i/100)*10;//(i/10)*(dist/300) + Math.cos(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
            // vect.z = ((zDist/limit)*i) + (vectorOffset.z) *((spread>>1)-(Math.abs((spread>>1)-i))) + Math.random()-0.5;// *dist/30;// + Math.sin(i/100)*10;//(i/10)*(dist/300) + Math.sin(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
             //TweenMax.from(vect,i/limit*2,{ease:Linear.easeNone,x:0,y:0,z:0,onUpdate:__onFlagGeometryForUpdate,onUpdateParams:[connectGeom]});
            var tarX = ((xDist/limit)*i) + (vectorOffset.x) *((spread>>1)-(Math.abs((spread>>1)-i))) + Math.random()-0.5;// *dist/30;//
            var tarY = ((yDist/limit)*i) + (vectorOffset.y) *((spread>>1)-(Math.abs((spread>>1)-i))) + Math.random()-0.5;// *dist/30;// 
            var tarZ = ((zDist/limit)*i) + (vectorOffset.z) *((spread>>1)-(Math.abs((spread>>1)-i))) + Math.random()-0.5;// *dist/30;// 
            TweenMax.to(vect,.3,{delay:i/limit,ease:Linear.easeNone,x:tarX,y:tarY,z:tarZ,onUpdate:__onFlagGeometryForUpdate,onUpdateParams:[connectGeom]});
            

            prevVector = vect;
            connectGeom.vertices.push(vect);
          }

          var connection = new THREE.Line(connectGeom,connectMat.clone());
          //console.log(connection);
          //connection.add(electrons);
          return connection;
        }

        function __generateConnectionPulse(weight,v1,v2)
        {
          var connectGeom = new THREE.Geometry();
          var connectMat = _lineConnectionMats[2];//weight];//_positiveHighConnectionMat;//_baseLineConnectionMat;//
          if(connectMat == undefined) console.log(weight);
          var originP = v1;
          var connectionP = v2; 

          var i=0;
          var dist = v1.distanceTo(v2);
          var xDist = (v2.x - v1.x);
          var yDist = (v2.y - v1.y);
          var zDist = (v2.z - v1.z);
          var limit = dist/50;//+100;
          var vectorOffset = new THREE.Vector3(0,0,0);
          var prevVector = new THREE.Vector3(0,0,0);
          var bezPath = [{x:0,y:0,z:0}];
          var tl = new TimelineMax({repeat:-1,repeatDelay:1,onUpdate:__onFlagGeometryForUpdate,bezier:bezierObj,onUpdateParams:[connectGeom]});
          tl.addLabel('fire');
          tl.addLabel('finish','fire += 1')
          for (i=0;i<=limit;++i)
          {
            var vect = new THREE.Vector3();
            var spread = limit;
            
            var avgDist = (Math.abs(xDist) + Math.abs(yDist) + Math.abs(zDist))/3
            var minDist = Math.min(xDist,yDist,zDist);

            //vectorOffset.add(new THREE.Vector3((Math.random()-0.5)*dist/100,(Math.random()-0.5)*dist/100,(Math.random()-0.5)*dist/100))
            vectorOffset = (new THREE.Vector3((Math.sin(i/limit*Math.PI*2)),(Math.cos(i/limit*Math.PI*2)),(Math.sin(i/limit*Math.PI*2))));
            
            
             //vect.x = ((xDist/limit)*i) + (vectorOffset.x) *((spread>>1)-(Math.abs((spread>>1)-i))) + Math.random()-0.5;// *dist/30;// + Math.sin(i/100)*10;//(i/10)*(dist/300) + Math.sin(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
             //vect.y = ((yDist/limit)*i) + (vectorOffset.y) *((spread>>1)-(Math.abs((spread>>1)-i))) + Math.random()-0.5;// *dist/30;// + Math.cos(i/100)*10;//(i/10)*(dist/300) + Math.cos(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
            // vect.z = ((zDist/limit)*i) + (vectorOffset.z) *((spread>>1)-(Math.abs((spread>>1)-i))) + Math.random()-0.5;// *dist/30;// + Math.sin(i/100)*10;//(i/10)*(dist/300) + Math.sin(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
             //TweenMax.from(vect,i/limit*2,{ease:Linear.easeNone,x:0,y:0,z:0,onUpdate:__onFlagGeometryForUpdate,onUpdateParams:[connectGeom]});
            var tarX = ((xDist/limit)*i) + (vectorOffset.x) *2*((spread>>1)-(Math.abs((spread>>1)-i))) + Math.random()-0.5;// *dist/30;//
            var tarY = ((yDist/limit)*i) + (vectorOffset.y) *2*((spread>>1)-(Math.abs((spread>>1)-i))) + Math.random()-0.5;// *dist/30;// 
            var tarZ = ((zDist/limit)*i) + (vectorOffset.z) *2*((spread>>1)-(Math.abs((spread>>1)-i))) + Math.random()-0.5;// *dist/30;// 
            vect.x = 0;//((xDist/limit)*i) + (vectorOffset.x) *((spread>>1)-(Math.abs((spread>>1)-i))) + Math.random()-0.5;// *dist/30;//
            vect.y = 0;//((yDist/limit)*i) + (vectorOffset.y) *((spread>>1)-(Math.abs((spread>>1)-i))) + Math.random()-0.5;// *dist/30;// 
            vect.z = 0;//((zDist/limit)*i) + (vectorOffset.z) *((spread>>1)-(Math.abs((spread>>1)-i))) + Math.random()-0.5;// *dist/30;// 
            // SPIRAL BEZ  //bezPath = bezPath.concat([{x:100*(Math.random()-0.5), y:100*(Math.random()-0.5), z:100*(Math.random()-0.5)}]);
            // SPIRAL BEZ  //outputPath = bezPath.concat([{x:10*(Math.random()-0.5), y:10*(Math.random()-0.5), z:10*(Math.random()-0.5)}]);
            bezPath = bezPath.concat([{x:tarX+20*(Math.random()-0.5), y:tarY+20*(Math.random()-0.5), z:tarZ+20*(Math.random()-0.5)}]);
            var outputPath = bezPath.concat([{x:tarX, y:tarY, z:tarZ}])

            var bezierObj = {curviness:2.0, values:outputPath, autoRotate:false};

            var speed = (limit/dist)*i/2

            tl.to(vect,speed,{ease:Linear.easeNone,x:tarX,y:tarY,z:tarZ, bezier:bezierObj},'fire');
            tl.to(vect,speed*0.25,{ease:Linear.easeNone,x:v2.x,y:v2.y,z:v2.z},'finish');
            //tl.to(vect,.2,{ease:Elastic.easeInOut,x:v2.x,y:v2.y,z:v2.z});

             //var tl = new TimelineMax({repeat:-1, repeatDelay:.4,onUpdate:__onFlagGeometryForUpdate,bezier:bezierObj,onUpdateParams:[connectGeom]});
             //tl.to(vect,2,{ease:Linear.easeNone,bezier:bezierObj,x:tarX,y:tarY,z:tarZ},'fire');
             //tl.to(vect,.2,{ease:Elastic.easeInOut,x:v2.x,y:v2.y,z:v2.z});

           // SPIRAL TWEEN // TweenMax.to(vect,2,{delay:i/limit,ease:Linear.easeNone,x:tarX,y:tarY,z:tarZ,bezier:bezierObj,onUpdate:__onFlagGeometryForUpdate,onUpdateParams:[connectGeom],repeat:-1});
            
            

            prevVector = vect;
            connectGeom.vertices.push(vect);
          }
         // connectGeom.vertices.push(connectionP);

          //var mat = local.generateParticleMaterial(10);
          //var electrons = new THREE.PointCloud( connectGeom, mat );

          var connection = new THREE.Line(connectGeom,connectMat.clone());
          //console.log(connection);
          //connection.add(electrons);
          return connection;
        }

        function __updateConnection(connection,v1,v2)
        {
            __updateConnectionLine(connection,v1,v2);
        }

        function __updateConnectionLine(connection,v1,v2)
        {
            connectGeom = connection.getVisualConnection().geometry; 
            //console.log('------------');
            //console.log(connectGeom);
            connectGeom.vertices[0].set(v1);
            var i=0;
            var dist = v1.distanceTo(v2);
            //console.log(connectGeom.vertices);
            var xDist = (v2.x - v1.x);
            var yDist = (v2.y - v1.y);
            var zDist = (v2.z - v1.z);

            var limit = connectGeom.vertices.length;//Math.random()*dist/30+8;
            var spread = limit;
            for (i=1;i<limit;++i)
            {
                var vect = new THREE.Vector3();
                
                /*var xDist = (v2.x - v1.x);
                var yDist = (v2.y - v1.y);
                var zDist = (v2.z - v1.z);
                
                vect.x = ((xDist/limit)*i) + Math.sin(i/10)*(dist/300) + Math.sin(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2// + Math.random()*4-2;
                vect.y = ((yDist/limit)*i) + Math.cos(i/10)*(dist/300) + Math.cos(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2// + Math.random()*4-2;
                vect.z = ((zDist/limit)*i) + Math.sin(i/10)*(dist/300) + Math.sin(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2// + Math.random()*4-2;*/

                vectorOffset = (new THREE.Vector3((Math.sin(i/limit*Math.PI*2)),(Math.cos(i/limit*Math.PI*2)),(Math.sin(i/limit*Math.PI*2))));
            
                vect.x = ((xDist/limit)*i) + (vectorOffset.x) *((spread>>1)-(Math.abs((spread>>1)-i))) + Math.random()-0.5;// *dist/30;// + Math.sin(i/100)*10;//(i/10)*(dist/300) + Math.sin(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
                vect.y = ((yDist/limit)*i) + (vectorOffset.y) *((spread>>1)-(Math.abs((spread>>1)-i)))+ Math.random()-0.5;// *dist/30;// + Math.cos(i/100)*10;//(i/10)*(dist/300) + Math.cos(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
                vect.z = ((zDist/limit)*i) + (vectorOffset.z) *((spread>>1)-(Math.abs((spread>>1)-i)))+ Math.random()-0.5;// *dist/30;// + Math.sin(i/100)*10;//(i/10)*(dist/300) + Math.sin(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
             
                connectGeom.vertices[i] = vect;
                if(i==limit-1)
                {
                     connectGeom.vertices[i] = v2;
                }
            }
            
            connectGeom.verticesNeedUpdate = true;
        }

        function __generateAttributeNerve(coreSize,v1,v2,motion)
        {
            var dist = v1.distanceTo(v2);
            var weight = 0;
            var connectGeom = new THREE.PlaneGeometry(0.1*(Math.abs(weight)+1),dist/10,1,Math.ceil(dist/2));
            var glowGeom = connectGeom.clone();
            var connectMat = _attributeRibbonMat.clone();//_ribbonConnectionMats[weight];
            //console.log(connectMat);
            var originP = v1;
            var connectionP = v2; 
            var i=0;
            var limit = connectGeom.vertices.length;//Math.random()*dist/30+8;
            //connectGeom.vertices[0] = originP;
            //connectGeom.vertices[1] = originP;
            var vectorOffset = new THREE.Vector3(0,0,0);
            var counter = -1;

            var spread = limit>>1;
            var xDist = (v2.x - v1.x);
            var yDist = (v2.y - v1.y);
            var zDist = (v2.z - v1.z);
            var rnd = Math.random()*10-5


            var tl = new TimelineMax({/*repeat:-1,repeatDelay:.4,yoyo:true,*/onUpdate:__onFlagGeometryForUpdate,onUpdateParams:[connectGeom]});
            tl.addLabel('fire');

            var xRnd = coreSize * 3;
            for (i=0;i<limit;++i)
            {
                //todo increment by 2 to keep nodes next to each other 
                if (i%2==0) counter++;
                var vect = connectGeom.vertices[i];//new THREE.Vector3();

                vectorOffset = (new THREE.Vector3((Math.sin(counter/spread*Math.PI*2)),(Math.cos(counter/spread*Math.PI*2)),(Math.sin(counter/spread*Math.PI*2))));

                var tarX = v1.x +/*Math.random() - 0.5 +*/ ((xDist/spread)*counter) + ((i%2)-.5)*(spread/(counter+1)/4/spread+0.01)*xRnd+ (vectorOffset.x) *((spread>>1)-(Math.abs((spread>>1)-counter)))/5;// *dist/30;// + Math.sin(i/100)*10;//(i/10)*(dist/300) + Math.sin(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
                var tarY = v1.y +/*Math.random() - 0.5 +*/ ((yDist/spread)*counter) + ((i%2)-.5)*(spread/(counter+1)/4/spread+0.01)*xRnd+ (vectorOffset.y) *((spread>>1)-(Math.abs((spread>>1)-counter)))/5;// *dist/30;// + Math.cos(i/100)*10;//(i/10)*(dist/300) + Math.cos(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
                var tarZ = v1.z +/*Math.random() - 0.5 +*/ ((zDist/spread)*counter) + ((i%2)-.5)*(spread/(counter+1)/4/spread+0.01)*xRnd+ (vectorOffset.z) *((spread>>1)-(Math.abs((spread>>1)-counter)))/5;// *dist/30;// + Math.sin(i/100)*10;//(i/10)*(dist/300) + Math.sin(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;

                vect.x = 0;
                vect.y = 0;
                vect.z = 0;

                var speed = i/200;

                tl.to(vect,speed,{ease:Linear.easeOut,x:tarX,y:tarY,z:tarZ},'fire');
                if(i==2)
                {
                    //TweenMax.to([vect,vectG],1,{x:'+='+Math.random()*2,y:'+='+Math.random()*2,z:'+='+Math.random()*2,repeat:-1,yoyo:true,onUpdate:__onFlagGeometryForUpdate,onUpdateParams:[[connectGeom,glowGeom]]});
                    //TweenMax.to(vect,1,{x:0,y:0,z:0,onUpdate:__onFlagGeometryForUpdate,onUpdateParams:[connectGeom]});

                }
                else
                {
                    //TODO: Set speed to a value of signal pulse intensity, smaller the faster the pulses transmit, 1 second max one 
                    //TweenMax.to([vect,vectG],.3,{ease:Bounce.easeInOut,delay:i/100,x:'+='+(Math.cos(counter)*dist*0.005),y:'+='+(Math.cos(counter)*dist*0.005),z:'+='+(Math.cos(counter)*dist*0.005),repeat:-1,yoyo:true});
                }
                //TweenMax.from(vect,.3,{ease:Bounce.easeInOut,delay:i/100,x:0,y:0,z:0,onUpdate:__onFlagGeometryForUpdate,onUpdateParams:[connectGeom]});
                //var xPos = ((xDist/limit)*i) + Math.sin(counter/4)*30;//(dist/200) ;//+ Math.random() *2 - 1;
                //var yPos = ((yDist/limit)*i) + Math.sin(counter/4)*30;//(dist/200);// + Math.random() *2 - 1;
                //var zPos = ((zDist/limit)*i) + Math.sin(counter/4)*30;//(dist/200) ;//+ Math.random() *2 - 1;

                //vect.x = xPos;//Math.sin(i/10)*((limit>>1)-(Math.abs((limit>>1)-i)))/2;
                //vect.y = yPos;//((yDist/limit)*i) + Math.cos(i/4)*(dist/100) + Math.random() *2 - 1;//Math.cos(i/10)*((limit>>1)-(Math.abs((limit>>1)-i)))/2;
                //vect.z = zPos;//((zDist/limit)*i) + Math.sin(i/4)*(dist/100) + Math.random() *2 - 1;//Math.sin(i/10)*((limit>>1)-(Math.abs((limit>>1)-i)))/2;
                //connectGeom.vertices[i] = vect;
            }
            //connectGeom.vertices[0] = originP;
            //connectGeom.vertices[1] = originP;
            
            connectGeom.vertices[limit-2] = connectionP;
            connectGeom.vertices[limit-1] = connectionP;

            limit = connectGeom.faces.length;
            var ribbonWeight = Math.floor(5+weight*5);
            var rndUV = _ribbonUvs[ribbonWeight];
            //console.log(ribbonWeight)
            //var rndUV = _textureUvs[Math.floor(Math.random()*10)];
            for(i=0;i<limit;++i)
            {
                var face = connectGeom.faces[i];
                 //var val = Math.floor(Math.random()*55)+200;
                // var rndUV = _textureUvs[Math.floor(Math.random()*10)];
                //var hex = '0x'+__rgbToHex(val,val,val);
                
               // var hex = 0xff0000;
                //connectGeom.faces[ i ].color.setHex( hex );
                //connectGeom.faceVertexUvs[0][i] = [ rndUV[0], rndUV[1], rndUV[2] ];
            }

          
          //connectGeom.vertices.push(connectionP);
          //glowGeom = connectGeom.clone()
          //var mat = local.generateParticleMaterial(10);
          //var electrons = new THREE.PointCloud( connectGeom, mat );

          var connection = new THREE.Mesh(connectGeom,connectMat);
          connection.material.side = THREE.DoubleSide;
         // var glow = new THREE.Mesh( glowGeom, _ribbonGlowMat.clone() );
            //glow.material.side = THREE.DoubleSide;
            //glow.scale.multiplyScalar(1.02);
            //_glows.push(glow);
            //_electrifiedGlows.push(glow);
            //connection.add( glow );
          //connection.add(electrons);
          return connection;
        }


        function __generateAttributeRibbon(coreSize,v1,v2,motion)
        {
            var dist = v1.distanceTo(v2);
            var weight = 0;
            var connectGeom = new THREE.PlaneGeometry(0.1*(Math.abs(weight)+1),dist/10,1,Math.ceil(dist/2));
            var glowGeom = connectGeom.clone();
            var connectMat = _attributeRibbonMat.clone();//_ribbonConnectionMats[weight];
            //console.log(connectMat);
            var originP = v1;
            var connectionP = v2; 
            var i=0;
            var limit = connectGeom.vertices.length;//Math.random()*dist/30+8;
            //connectGeom.vertices[0] = originP;
            //connectGeom.vertices[1] = originP;
            var vectorOffset = new THREE.Vector3(0,0,0);
            var counter = -1;

            var spread = limit>>1;
            var xDist = (v2.x - v1.x);
            var yDist = (v2.y - v1.y);
            var zDist = (v2.z - v1.z);
            var rnd = Math.random()*10-5

             var tl = new TimelineMax({/*repeat:-1,repeatDelay:.4,yoyo:true,*/onUpdate:__onFlagGeometryForUpdate,onUpdateParams:[connectGeom]});
            tl.addLabel('fire');

            for (i=0;i<limit;++i)
            {
                //todo increment by 2 to keep nodes next to each other 
                if (i%2==0) counter++;
                var vect = connectGeom.vertices[i];//new THREE.Vector3();
                

                    //todo: Refactor this.
                //vectorOffset = (new THREE.Vector3((Math.sin(counter/spread*Math.PI*2)),(Math.cos(counter/spread*Math.PI*2)),(Math.sin(counter/spread*Math.PI*2))));
            
                //vect.x = ((xDist/spread)*counter) + ((i%2)-.5)*(Math.abs(weight*1)) + (vectorOffset.x) *((spread>>1)-(Math.abs((spread>>1)-i)))/2;// + Math.sin((counter/4)-Math.PI/2);//*(dist/200);// + Math.sin(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                //vect.y = ((yDist/spread)*counter) + ((i%2)-.5)*(Math.abs(weight*1)) + (vectorOffset.x) *((spread>>1)-(Math.abs((spread>>1)-i)))/2;// + Math.cos((counter/4)-Math.PI/2);//*(dist/200);// + Math.cos(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                //vect.z = ((zDist/spread)*counter) + ((i%2)-.5)*(Math.abs(weight*1)) + (vectorOffset.x) *((spread>>1)-(Math.abs((spread>>1)-i)))/2;// + Math.sin((counter/4)-Math.PI/2);//*(dist/200);// + Math.sin(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                
                vectorOffset = (new THREE.Vector3((Math.sin(counter/spread*Math.PI*2)),(Math.cos(counter/spread*Math.PI*2)),(Math.sin(counter/spread*Math.PI*2))));
                
                tarX = v1.x + Math.sin(counter/spread*10) + ((xDist/spread)*counter) + ((i%2)-.5)*(spread/(counter+1))/3;//(Math.abs(weight*14))+ (vectorOffset.x) *2;// *((spread>>1)-(Math.abs((spread>>1)-counter)))/2;// *dist/30;// + Math.sin(i/100)*10;//(i/10)*(dist/300) + Math.sin(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
                tarY = v1.y + Math.cos(counter/spread*10) + ((yDist/spread)*counter) + ((i%2)-.5)*(spread/(counter+1))/3;//(Math.abs(weight*14))+ (vectorOffset.y) *2;// *((spread>>1)-(Math.abs((spread>>1)-counter)))/2;// *dist/30;// + Math.cos(i/100)*10;//(i/10)*(dist/300) + Math.cos(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
                tarZ = v1.z + Math.sin(counter/spread*10) + ((zDist/spread)*counter) + ((i%2)-.5)*(spread/(counter+1))/3;//(Math.abs(weight*14))+ (vectorOffset.z) *2;// *((spread>>1)-(Math.abs((spread>>1)-counter)))/2;// *dist/30;// + Math.sin(i/100)*10;//(i/10)*(dist/300) + Math.sin(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
           
                vect.x = 0;
                vect.y = 0;
                vect.z = 0;

                var speed = i/200;

                tl.to(vect,speed,{ease:Linear.easeOut,x:tarX,y:tarY,z:tarZ},'fire');
                
                if(i==2)
                {
                    //TweenMax.to([vect,vectG],1,{x:'+='+Math.random()*2,y:'+='+Math.random()*2,z:'+='+Math.random()*2,repeat:-1,yoyo:true,onUpdate:__onFlagGeometryForUpdate,onUpdateParams:[[connectGeom,glowGeom]]});
                    //TweenMax.to(vect,1,{x:0,y:0,z:0,onUpdate:__onFlagGeometryForUpdate,onUpdateParams:[connectGeom]});

                }
                else
                {
                    //TODO: Set speed to a value of signal pulse intensity, smaller the faster the pulses transmit, 1 second max one 
                    //TweenMax.to([vect,vectG],.3,{ease:Bounce.easeInOut,delay:i/100,x:'+='+(Math.cos(counter)*dist*0.005),y:'+='+(Math.cos(counter)*dist*0.005),z:'+='+(Math.cos(counter)*dist*0.005),repeat:-1,yoyo:true});
                }
                //TweenMax.from(vect,.3,{ease:Bounce.easeInOut,delay:i/100,x:0,y:0,z:0,onUpdate:__onFlagGeometryForUpdate,onUpdateParams:[connectGeom]});
                //var xPos = ((xDist/limit)*i) + Math.sin(counter/4)*30;//(dist/200) ;//+ Math.random() *2 - 1;
                //var yPos = ((yDist/limit)*i) + Math.sin(counter/4)*30;//(dist/200);// + Math.random() *2 - 1;
                //var zPos = ((zDist/limit)*i) + Math.sin(counter/4)*30;//(dist/200) ;//+ Math.random() *2 - 1;

                //vect.x = xPos;//Math.sin(i/10)*((limit>>1)-(Math.abs((limit>>1)-i)))/2;
                //vect.y = yPos;//((yDist/limit)*i) + Math.cos(i/4)*(dist/100) + Math.random() *2 - 1;//Math.cos(i/10)*((limit>>1)-(Math.abs((limit>>1)-i)))/2;
                //vect.z = zPos;//((zDist/limit)*i) + Math.sin(i/4)*(dist/100) + Math.random() *2 - 1;//Math.sin(i/10)*((limit>>1)-(Math.abs((limit>>1)-i)))/2;
                //connectGeom.vertices[i] = vect;
            }
            //connectGeom.vertices[0] = originP;
            //connectGeom.vertices[1] = originP;
            
            connectGeom.vertices[limit-2] = connectionP;
            connectGeom.vertices[limit-1] = connectionP;

            limit = connectGeom.faces.length;
            var ribbonWeight = Math.floor(5+weight*5);
            var rndUV = _ribbonUvs[ribbonWeight];
            //console.log(ribbonWeight)
            //var rndUV = _textureUvs[Math.floor(Math.random()*10)];
            for(i=0;i<limit;++i)
            {
                var face = connectGeom.faces[i];
                 //var val = Math.floor(Math.random()*55)+200;
                // var rndUV = _textureUvs[Math.floor(Math.random()*10)];
                //var hex = '0x'+__rgbToHex(val,val,val);
                
               // var hex = 0xff0000;
                //connectGeom.faces[ i ].color.setHex( hex );
                //connectGeom.faceVertexUvs[0][i] = [ rndUV[0], rndUV[1], rndUV[2] ];
            }

          
          //connectGeom.vertices.push(connectionP);
          //glowGeom = connectGeom.clone()
          //var mat = local.generateParticleMaterial(10);
          //var electrons = new THREE.PointCloud( connectGeom, mat );

          var connection = new THREE.Mesh(connectGeom,connectMat);
          connection.material.side = THREE.DoubleSide;
         // var glow = new THREE.Mesh( glowGeom, _ribbonGlowMat.clone() );
            //glow.material.side = THREE.DoubleSide;
            //glow.scale.multiplyScalar(1.02);
            //_glows.push(glow);
            //_electrifiedGlows.push(glow);
            //connection.add( glow );
          //connection.add(electrons);
          return connection;
        }



        function __generateConnectionNerve(coreSize,v1,v2,motion)
        {
            var dist = v1.distanceTo(v2);
            var weight = 0;
            var connectGeom = new THREE.PlaneGeometry(0.1*(Math.abs(weight)+1),dist/10,1,Math.ceil(dist/5));
            //var connectGeom = new THREE.BoxGeometry(0.1*(Math.abs(weight)+1),dist/10,dist/10,1,Math.ceil(dist/5),1);
            
            var glowGeom = connectGeom.clone();
            var connectMat = _ribbonMat.clone();//_ribbonConnectionMats[weight];
            //console.log(connectMat);
            var originP = v1;
            var connectionP = v2; 
            var i=0;
            var limit = connectGeom.vertices.length;//Math.random()*dist/30+8;
            //connectGeom.vertices[0] = originP;
            //connectGeom.vertices[1] = originP;
            var vectorOffset = new THREE.Vector3(0,0,0);
            var counter = -1;

            var spread = limit>>1;
            var xDist = (v2.x - v1.x);
            var yDist = (v2.y - v1.y);
            var zDist = (v2.z - v1.z);
            var minDist = Math.min(xDist,yDist,zDist);
            var maxDist = Math.max(xDist,yDist,zDist);
            var rnd = Math.random()*10-5
            var bezPath = [{x:0,y:0,z:0}];

            var xRnd = coreSize * 3;
           // xRnd = (Math.random() > 0.5) ? -xRnd : xRnd;

            var tl = new TimelineMax({delay:1,/*repeat:-1,repeatDelay:.4,yoyo:true,*/onUpdate:__onFlagGeometryForUpdate,onUpdateParams:[connectGeom]});
            tl.addLabel('fire');
            //var yRnd = Math.random()*minDist+coreSize;
            //var zRnd = Math.random()*minDist+coreSize;
            for (i=0;i<limit;++i)
            {
                //todo increment by 2 to keep nodes next to each other 
                if (i%2==0) counter++;
                var vect = connectGeom.vertices[i];//new THREE.Vector3();
                

                    //todo: Refactor this.
                //vectorOffset = (new THREE.Vector3((Math.sin(counter/spread*Math.PI*2)),(Math.cos(counter/spread*Math.PI*2)),(Math.sin(counter/spread*Math.PI*2))));
            
                //vect.x = ((xDist/spread)*counter) + ((i%2)-.5)*(Math.abs(weight*1)) + (vectorOffset.x) *((spread>>1)-(Math.abs((spread>>1)-i)))/2;// + Math.sin((counter/4)-Math.PI/2);//*(dist/200);// + Math.sin(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                //vect.y = ((yDist/spread)*counter) + ((i%2)-.5)*(Math.abs(weight*1)) + (vectorOffset.x) *((spread>>1)-(Math.abs((spread>>1)-i)))/2;// + Math.cos((counter/4)-Math.PI/2);//*(dist/200);// + Math.cos(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                //vect.z = ((zDist/spread)*counter) + ((i%2)-.5)*(Math.abs(weight*1)) + (vectorOffset.x) *((spread>>1)-(Math.abs((spread>>1)-i)))/2;// + Math.sin((counter/4)-Math.PI/2);//*(dist/200);// + Math.sin(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                
                vectorOffset = (new THREE.Vector3((Math.sin(counter/spread*Math.PI*2)),(Math.cos(counter/spread*Math.PI*2)),(Math.sin(counter/spread*Math.PI*2))));
                
                //vect.x = v1.x + Math.sin(counter) + ((xDist/spread)*counter) + ((i%2)-.5)*(spread/(counter+1))/3;//(Math.abs(weight*14))+ (vectorOffset.x) *2;// *((spread>>1)-(Math.abs((spread>>1)-counter)))/2;// *dist/30;// + Math.sin(i/100)*10;//(i/10)*(dist/300) + Math.sin(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
                //vect.y = v1.y + Math.cos(counter) + ((yDist/spread)*counter) + ((i%2)-.5)*(spread/(counter+1))/3;//(Math.abs(weight*14))+ (vectorOffset.y) *2;// *((spread>>1)-(Math.abs((spread>>1)-counter)))/2;// *dist/30;// + Math.cos(i/100)*10;//(i/10)*(dist/300) + Math.cos(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
                //vect.z = v1.z + Math.sin(counter) + ((zDist/spread)*counter) + ((i%2)-.5)*(spread/(counter+1))/3;//(Math.abs(weight*14))+ (vectorOffset.z) *2;// *((spread>>1)-(Math.abs((spread>>1)-counter)))/2;// *dist/30;// + Math.sin(i/100)*10;//(i/10)*(dist/300) + Math.sin(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
           

                var tarX = v1.x +/*Math.random() - 0.5 +*/ ((xDist/spread)*counter) + ((i%2)-.5)*(spread/(counter+1)/4/spread+0.01)*xRnd+ (vectorOffset.x) *((spread>>1)-(Math.abs((spread>>1)-counter)))/5;// *dist/30;// + Math.sin(i/100)*10;//(i/10)*(dist/300) + Math.sin(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
                var tarY = v1.y +/*Math.random() - 0.5 +*/ ((yDist/spread)*counter) + ((i%2)-.5)*(spread/(counter+1)/4/spread+0.01)*xRnd+ (vectorOffset.y) *((spread>>1)-(Math.abs((spread>>1)-counter)))/5;// *dist/30;// + Math.cos(i/100)*10;//(i/10)*(dist/300) + Math.cos(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
                var tarZ = v1.z +/*Math.random() - 0.5 +*/ ((zDist/spread)*counter) + ((i%2)-.5)*(spread/(counter+1)/4/spread+0.01)*xRnd+ (vectorOffset.z) *((spread>>1)-(Math.abs((spread>>1)-counter)))/5;// *dist/30;// + Math.sin(i/100)*10;//(i/10)*(dist/300) + Math.sin(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
                
                vect.x = 0;
                vect.y = 0;
                vect.z = 0;

                if (i >= limit-2)
                {
                    tarX = connectionP.x;
                    tarY = connectionP.y;
                    tarZ = connectionP.z;
                }

                /*var step = Math.abs(counter-0);
                if (step == 0)
                {
                    step = 1;
                }
                if (counter < 14)
                {
                    if (maxDist == xDist || Math.random()>0.5)
                    {
                        vect.x += ((i%2)-.5)*(spread/(step)/spread)*coreSize;//minDist;
                    }
                    if (maxDist == yDist || Math.random()>0.5)
                    {
                        vect.y += ((i%2)-.5)*(spread/(step)/spread)*coreSize;//minDist;
                    }
                    if (maxDist == zDist || Math.random()>0.5)
                    {
                        vect.z += ((i%2)-.5)*(spread/(step)/spread)*coreSize;//minDist;
                    }
                }
                else
                {
                    vect.x += ((i%2)-.5)*(spread/(step)/spread)*dist;//minDist;
                    vect.y += ((i%2)-.5)*(spread/(step)/spread)*dist;//minDist;
                    vect.z += ((i%2)-.5)*(spread/(step)/spread)*dist;//minDist;
                }*/
            

                if (counter %10 == 0) bezPath = bezPath.concat([{x:tarX+20*(Math.random()-0.5), y:tarY+20*(Math.random()-0.5), z:tarZ+20*(Math.random()-0.5)}]);
                var outputPath = bezPath.concat([{x:tarX, y:tarY, z:tarZ}])

                var bezierObj = {curviness:2.0, values:outputPath, autoRotate:false};

                var speed = i/100;//(limit/dist)*i*10

                //SPARKY SIGNAL VERY INTENSIVE //tl.to(vect,speed,{ease:Linear.easeNone,x:tarX,y:tarY,z:tarZ, bezier:bezierObj},'fire');
                tl.to(vect,speed,{ease:Quad.easeInOut,x:tarX,y:tarY,z:tarZ},'fire');
                //tl.to(vect,speed,{ease:Linear.easeNone,x:v2.x,y:v2.y,z:v2.z},'finish');
                
                if(i==2)
                {
                    //TweenMax.to([vect,vectG],1,{x:'+='+Math.random()*2,y:'+='+Math.random()*2,z:'+='+Math.random()*2,repeat:-1,yoyo:true,onUpdate:__onFlagGeometryForUpdate,onUpdateParams:[[connectGeom,glowGeom]]});
                    //TweenMax.to(vect,1,{x:0,y:0,z:0,onUpdate:__onFlagGeometryForUpdate,onUpdateParams:[connectGeom]});

                }
                else
                {
                    //TODO: Set speed to a value of signal pulse intensity, smaller the faster the pulses transmit, 1 second max one 
                    //TweenMax.to([vect,vectG],.3,{ease:Bounce.easeInOut,delay:i/100,x:'+='+(Math.cos(counter)*dist*0.005),y:'+='+(Math.cos(counter)*dist*0.005),z:'+='+(Math.cos(counter)*dist*0.005),repeat:-1,yoyo:true});
                }
                //TweenMax.from(vect,.3,{ease:Bounce.easeInOut,delay:i/100,x:0,y:0,z:0,onUpdate:__onFlagGeometryForUpdate,onUpdateParams:[connectGeom]});
                //var xPos = ((xDist/limit)*i) + Math.sin(counter/4)*30;//(dist/200) ;//+ Math.random() *2 - 1;
                //var yPos = ((yDist/limit)*i) + Math.sin(counter/4)*30;//(dist/200);// + Math.random() *2 - 1;
                //var zPos = ((zDist/limit)*i) + Math.sin(counter/4)*30;//(dist/200) ;//+ Math.random() *2 - 1;

                //vect.x = xPos;//Math.sin(i/10)*((limit>>1)-(Math.abs((limit>>1)-i)))/2;
                //vect.y = yPos;//((yDist/limit)*i) + Math.cos(i/4)*(dist/100) + Math.random() *2 - 1;//Math.cos(i/10)*((limit>>1)-(Math.abs((limit>>1)-i)))/2;
                //vect.z = zPos;//((zDist/limit)*i) + Math.sin(i/4)*(dist/100) + Math.random() *2 - 1;//Math.sin(i/10)*((limit>>1)-(Math.abs((limit>>1)-i)))/2;
                //connectGeom.vertices[i] = vect;
            }
            //connectGeom.vertices[0] = originP;
            //connectGeom.vertices[1] = originP;
            
            //connectGeom.vertices[limit-2] = connectionP;
            //connectGeom.vertices[limit-1] = connectionP;

            limit = connectGeom.faces.length;
            var ribbonWeight = Math.floor(5+weight*5);
            var rndUV = _ribbonUvs[ribbonWeight];
            //console.log(ribbonWeight)
            //var rndUV = _textureUvs[Math.floor(Math.random()*10)];
            for(i=0;i<limit;++i)
            {
                var face = connectGeom.faces[i];
                 //var val = Math.floor(Math.random()*55)+200;
                // var rndUV = _textureUvs[Math.floor(Math.random()*10)];
                //var hex = '0x'+__rgbToHex(val,val,val);
                
               // var hex = 0xff0000;
                //connectGeom.faces[ i ].color.setHex( hex );
                //connectGeom.faceVertexUvs[0][i] = [ rndUV[0], rndUV[1], rndUV[2] ];
            }
            //connectGeom.vertices[limit-2] = connectionP;
            //connectGeom.vertices[limit-1] = connectionP;
          
          //connectGeom.vertices.push(connectionP);
          //glowGeom = connectGeom.clone()
          //var mat = local.generateParticleMaterial(10);
          //var electrons = new THREE.PointCloud( connectGeom, mat );

          var connection = new THREE.Mesh(connectGeom,connectMat);
          _connectionsArray.push(connection);
          /*connection.flipSided = false
          connection.doubleSided = true;*/
          //connection.material.side = THREE.DoubleSide;
         // var glow = new THREE.Mesh( glowGeom, _ribbonGlowMat.clone() );
            //glow.material.side = THREE.DoubleSide;
            //glow.scale.multiplyScalar(1.02);
            //_glows.push(glow);
            //_electrifiedGlows.push(glow);
            //connection.add( glow );
          //connection.add(electrons);
          return connection;
        }


        function __updateConnectionNerve(connection,coreSize,v1,v2)
        {

            
            var dist = v1.distanceTo(v2);
            var connectGeom = connection.getVisualConnection().geometry; 
            connectGeom.verticesNeedUpdate = true;

            var glowGeom = connectGeom.clone();
            //var connectMat = _ribbonConnectionMats[weight];
            //console.log(connectMat);
            var originP = v1;
            var connectionP = v2; 
            var i=0;
            var limit = connectGeom.vertices.length;//Math.random()*dist/30+8;

            var spread = limit;
            var xDist = (v2.x - v1.x);
            var yDist = (v2.y - v1.y);
            var zDist = (v2.z - v1.z);

            var xSpacing = xDist / (limit>>1);
            var ySpacing = yDist / (limit>>1);
            var zSpacing = zDist / (limit>>1);

            var xRnd = coreSize * 3;
            
            var counter = -1;
            for (i=0;i<limit;++i)
            {
                // increment by 2 to keep nodes next to each other 
                if (i%2==0) counter++;
                var vect = connectGeom.vertices[i];
                
                vectorOffset = (new THREE.Vector3((Math.sin(counter/spread*Math.PI*2)),(Math.cos(counter/spread*Math.PI*2)),(Math.sin(counter/spread*Math.PI*2))));
                

                var tarX = v1.x +/*Math.random() - 0.5 +*/ (xSpacing*counter) + ((i%2)-.5)*(spread/(counter+1)/4/spread+0.01)*xRnd+ (vectorOffset.x) *((spread>>1)-(Math.abs((spread>>1)-counter)))/5;// *dist/30;// + Math.sin(i/100)*10;//(i/10)*(dist/300) + Math.sin(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
                var tarY = v1.y +/*Math.random() - 0.5 +*/ (ySpacing*counter) + ((i%2)-.5)*(spread/(counter+1)/4/spread+0.01)*xRnd+ (vectorOffset.y) *((spread>>1)-(Math.abs((spread>>1)-counter)))/5;// *dist/30;// + Math.cos(i/100)*10;//(i/10)*(dist/300) + Math.cos(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
                var tarZ = v1.z +/*Math.random() - 0.5 +*/ (zSpacing*counter) + ((i%2)-.5)*(spread/(counter+1)/4/spread+0.01)*xRnd+ (vectorOffset.z) *((spread>>1)-(Math.abs((spread>>1)-counter)))/5;// *dist/30;// + Math.sin(i/100)*10;//(i/10)*(dist/300) + Math.sin(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
                
                vect.x = tarX;
                vect.y = tarY;
                vect.z = tarZ;

          }
        }


        function __vibrateConnectionNerve(connection)
        {

            
            var connectGeom = connection.getVisualConnection().geometry; 
            connectGeom.verticesNeedUpdate = true;

            var i=0;
            var limit = connectGeom.vertices.length;//Math.random()*dist/30+8;

            var spread = limit;

            var counter = -1;
            for (i=0;i<limit;++i)
            {
                // increment by 2 to keep nodes next to each other 
                if (i%2==0) counter++;
                var vect = connectGeom.vertices[i];
                
                vectorOffset = (new THREE.Vector3((Math.cos(counter/spread*Math.PI*2)*10),(Math.sin(counter/spread*Math.PI*2)*10),(Math.cos(counter/spread*Math.PI*2)*10)));
                TweenMax.to(vect,0.5,{x:'+='+vectorOffset.x,y:'+='+vectorOffset.y,z:'+='+vectorOffset.z, repeat:1, yoyo:true, onUpdate:__onFlagGeometryForUpdate, onUpdateParams:[connectGeom]})
          }
        }



        function __generateConnectionRibbon(weight,v1,v2,motion)
        {
            var dist = v1.distanceTo(v2);
            var connectGeom = connection.getVisualConnection().geometry;//new THREE.PlaneGeometry(0.1*(Math.abs(weight)+1),dist/10,1,90);
            var glowGeom = connectGeom.clone();
            var connectMat = _ribbonMat.clone();//_ribbonConnectionMats[weight];
            //console.log(connectMat);
            var originP = v1;
            var connectionP = v2; 
            var i=0;
            var limit = connectGeom.vertices.length;//Math.random()*dist/30+8;
            connectGeom.vertices[0] = originP;
            connectGeom.vertices[1] = originP;
            var vectorOffset = new THREE.Vector3(0,0,0);
            var counter = 0;

            var spread = limit>>1;
            var xDist = (v2.x - v1.x);
            var yDist = (v2.y - v1.y);
            var zDist = (v2.z - v1.z);
            for (i=1;i<limit;++i)
            {
                //todo increment by 2 to keep nodes next to each other 
                if (i%2==0) counter++;
                var vect = connectGeom.vertices[i];//new THREE.Vector3();
                

                    //todo: Refactor this.
                //vectorOffset = (new THREE.Vector3((Math.sin(counter/spread*Math.PI*2)),(Math.cos(counter/spread*Math.PI*2)),(Math.sin(counter/spread*Math.PI*2))));
            
                //vect.x = ((xDist/spread)*counter) + ((i%2)-.5)*(Math.abs(weight*1)) + (vectorOffset.x) *((spread>>1)-(Math.abs((spread>>1)-i)))/2;// + Math.sin((counter/4)-Math.PI/2);//*(dist/200);// + Math.sin(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                //vect.y = ((yDist/spread)*counter) + ((i%2)-.5)*(Math.abs(weight*1)) + (vectorOffset.x) *((spread>>1)-(Math.abs((spread>>1)-i)))/2;// + Math.cos((counter/4)-Math.PI/2);//*(dist/200);// + Math.cos(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                //vect.z = ((zDist/spread)*counter) + ((i%2)-.5)*(Math.abs(weight*1)) + (vectorOffset.x) *((spread>>1)-(Math.abs((spread>>1)-i)))/2;// + Math.sin((counter/4)-Math.PI/2);//*(dist/200);// + Math.sin(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                
                vectorOffset = (new THREE.Vector3((Math.sin(counter/spread*Math.PI*2)),(Math.cos(counter/spread*Math.PI*2)),(Math.sin(counter/spread*Math.PI*2))));
            
            vect.x = Math.random() - 0.5 + ((xDist/spread)*counter) + ((i%2)-.5)*(Math.abs(weight*4))+ (vectorOffset.x) *((spread>>1)-(Math.abs((spread>>1)-counter)))/2;// *dist/30;// + Math.sin(i/100)*10;//(i/10)*(dist/300) + Math.sin(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
            vect.y = Math.random() - 0.5 +((yDist/spread)*counter) + ((i%2)-.5)*(Math.abs(weight*4))+ (vectorOffset.y) *((spread>>1)-(Math.abs((spread>>1)-counter)))/2;// *dist/30;// + Math.cos(i/100)*10;//(i/10)*(dist/300) + Math.cos(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
            vect.z = Math.random() - 0.5 +((zDist/spread)*counter) + ((i%2)-.5)*(Math.abs(weight*4))+ (vectorOffset.z) *((spread>>1)-(Math.abs((spread>>1)-counter)))/2;// *dist/30;// + Math.sin(i/100)*10;//(i/10)*(dist/300) + Math.sin(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
           
                
                if(i==2)
                {
                    //TweenMax.to([vect,vectG],1,{x:'+='+Math.random()*2,y:'+='+Math.random()*2,z:'+='+Math.random()*2,repeat:-1,yoyo:true,onUpdate:__onFlagGeometryForUpdate,onUpdateParams:[[connectGeom,glowGeom]]});
                    //TweenMax.to(vect,1,{x:0,y:0,z:0,onUpdate:__onFlagGeometryForUpdate,onUpdateParams:[connectGeom]});

                }
                else
                {
                    //TODO: Set speed to a value of signal pulse intensity, smaller the faster the pulses transmit, 1 second max one 
                    //TweenMax.to([vect,vectG],.3,{ease:Bounce.easeInOut,delay:i/100,x:'+='+(Math.cos(counter)*dist*0.005),y:'+='+(Math.cos(counter)*dist*0.005),z:'+='+(Math.cos(counter)*dist*0.005),repeat:-1,yoyo:true});
                }
                TweenMax.from(vect,.3,{ease:Bounce.easeInOut,delay:i/100,x:0,y:0,z:0,onUpdate:__onFlagGeometryForUpdate,onUpdateParams:[connectGeom]});
                //var xPos = ((xDist/limit)*i) + Math.sin(counter/4)*30;//(dist/200) ;//+ Math.random() *2 - 1;
                //var yPos = ((yDist/limit)*i) + Math.sin(counter/4)*30;//(dist/200);// + Math.random() *2 - 1;
                //var zPos = ((zDist/limit)*i) + Math.sin(counter/4)*30;//(dist/200) ;//+ Math.random() *2 - 1;

                //vect.x = xPos;//Math.sin(i/10)*((limit>>1)-(Math.abs((limit>>1)-i)))/2;
                //vect.y = yPos;//((yDist/limit)*i) + Math.cos(i/4)*(dist/100) + Math.random() *2 - 1;//Math.cos(i/10)*((limit>>1)-(Math.abs((limit>>1)-i)))/2;
                //vect.z = zPos;//((zDist/limit)*i) + Math.sin(i/4)*(dist/100) + Math.random() *2 - 1;//Math.sin(i/10)*((limit>>1)-(Math.abs((limit>>1)-i)))/2;
                //connectGeom.vertices[i] = vect;
            }
            connectGeom.vertices[0] = originP;
            //connectGeom.vertices[1] = originP;
            
            //connectGeom.vertices[limit-2] = connectionP;
            connectGeom.vertices[limit-1] = connectionP;

            limit = connectGeom.faces.length;
            var ribbonWeight = Math.floor(5+weight*5);
            var rndUV = _ribbonUvs[ribbonWeight];
            //console.log(ribbonWeight)
            //var rndUV = _textureUvs[Math.floor(Math.random()*10)];
            for(i=0;i<limit;++i)
            {
                var face = connectGeom.faces[i];
                 //var val = Math.floor(Math.random()*55)+200;
                // var rndUV = _textureUvs[Math.floor(Math.random()*10)];
                //var hex = '0x'+__rgbToHex(val,val,val);
                
               // var hex = 0xff0000;
                //connectGeom.faces[ i ].color.setHex( hex );
                connectGeom.faceVertexUvs[0][i] = [ rndUV[0], rndUV[1], rndUV[2] ];
            }

          
          //connectGeom.vertices.push(connectionP);
          //glowGeom = connectGeom.clone()
          //var mat = local.generateParticleMaterial(10);
          //var electrons = new THREE.PointCloud( connectGeom, mat );

          var connection = new THREE.Mesh(connectGeom,connectMat);
          connection.material.side = THREE.DoubleSide;
         // var glow = new THREE.Mesh( glowGeom, _ribbonGlowMat.clone() );
            //glow.material.side = THREE.DoubleSide;
            //glow.scale.multiplyScalar(1.02);
            //_glows.push(glow);
            //_electrifiedGlows.push(glow);
            //connection.add( glow );
          //connection.add(electrons);
          return connection;
        }

        function __updateConnectionRibbon(connection,v1,v2)
        {
            connectGeom = connection.getVisualConnection().geometry; 
            //console.log('------------');
            //console.log(connectGeom);
            connectGeom.vertices[0] = v1;
            connectGeom.vertices[1] = v1;
            var i=0;
            var dist = v1.distanceTo(v2);
            //console.log(connectGeom.vertices);
            var limit = connectGeom.vertices.length;//Math.random()*dist/30+8;
            var counter = 0;
            var spread = limit;
                var xDist = (v2.x - v1.x);
                var yDist = (v2.y - v1.y);
                var zDist = (v2.z - v1.z);
            for (i=2;i<limit;++i)
            {
                if (i%2==0) counter++;
                var vect = connectGeom.vertices[i];//new THREE.Vector3();
                var vectG = glowGeom.vertices[i];
                

                vectorOffset = (new THREE.Vector3((Math.sin(counter/spread*Math.PI*2)),(Math.cos(counter/spread*Math.PI*2)),(Math.sin(counter/spread*Math.PI*2))));
            
            vect.x = Math.random() - 0.5 + ((xDist/spread)*counter) + ((i%2)-.5)*(Math.abs(weight*4))+ (vectorOffset.x) *((spread>>1)-(Math.abs((spread>>1)-counter)))/2;// *dist/30;// + Math.sin(i/100)*10;//(i/10)*(dist/300) + Math.sin(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
            vect.y = Math.random() - 0.5 +((yDist/spread)*counter) + ((i%2)-.5)*(Math.abs(weight*4))+ (vectorOffset.y) *((spread>>1)-(Math.abs((spread>>1)-counter)))/2;// *dist/30;// + Math.cos(i/100)*10;//(i/10)*(dist/300) + Math.cos(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
            vect.z = Math.random() - 0.5 +((zDist/spread)*counter) + ((i%2)-.5)*(Math.abs(weight*4))+ (vectorOffset.z) *((spread>>1)-(Math.abs((spread>>1)-counter)))/2;// *dist/30;// + Math.sin(i/100)*10;//(i/10)*(dist/300) + Math.sin(i/10)*((spread>>1)-(Math.abs((spread>>1)-i)))/2;
           
                
                //vect.x = ((xDist/limit*2)*counter) + ((i%2)-.5)*4 + Math.sin((counter/4)-Math.PI/2);//*(dist/200);// + Math.sin(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                //vect.y = ((yDist/limit*2)*counter) + ((i%2)-.5)*4 + Math.cos((counter/4)-Math.PI/2);//*(dist/200);// + Math.cos(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                //vect.z = ((zDist/limit*2)*counter) + ((i%2)-.5)*4 + Math.sin((counter/4)-Math.PI/2);//*(dist/200);// + Math.sin(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                
                connectGeom.vertices[i] = vect;
                if(i==limit-1)
                {
                    connectGeom.vertices[i] = v2;
                }
            }



            connectGeom.vertices[limit-2] = connectionP;
            connectGeom.vertices[limit-1] = connectionP;
            
            connectGeom.verticesNeedUpdate = true;



            var dist = v1.distanceTo(v2);
            var connectGeom = new THREE.PlaneGeometry(0.1*(Math.abs(weight)+1),dist/20,1,90);


            var glowGeom = connectGeom.clone();
            var connectMat = _ribbonConnectionMats[weight];
            //console.log(connectMat);
            var originP = v1;
            var connectionP = v2; 
            var i=0;
            var limit = connectGeom.vertices.length;//Math.random()*dist/30+8;
            
            var counter = 0;
            for (i=2;i<limit-1;++i)
            {
                // increment by 2 to keep nodes next to each other 
                if (i%2==0) counter++;
                var vect = connectGeom.vertices[i];
                var vectG = glowGeom.vertices[i];
                var spread = limit;
                var xDist = (v2.x - v1.x);
                var yDist = (v2.y - v1.y);
                var zDist = (v2.z - v1.z);


                //vectG.x = vect.x = ((xDist/limit*2)*counter) + ((i%2)-.5)*4;// + Math.sin((counter/4)-Math.PI/2)*(dist/20);// + Math.sin(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                //vectG.y = vect.y = ((yDist/limit*2)*counter) + ((i%2)-.5)*4;// + Math.cos((counter/4)-Math.PI/2)*(dist/20);// + Math.cos(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                //vectG.z = vect.z = ((zDist/limit*2)*counter) + ((i%2)-.5)*4;// + Math.sin((counter/4)-Math.PI/2)*(dist/20);// + Math.sin(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                
                //vect.x = ((xDist/limit*2)*counter) + ((i%2)-.5)*4 + Math.sin((counter/4)-Math.PI/2);//*(dist/200);// + Math.sin(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                //vect.y = ((yDist/limit*2)*counter) + ((i%2)-.5)*4 + Math.cos((counter/4)-Math.PI/2);//*(dist/200);// + Math.cos(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                //vect.z = ((zDist/limit*2)*counter) + ((i%2)-.5)*4 + Math.sin((counter/4)-Math.PI/2);//*(dist/200);// + Math.sin(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                
          }

        }

        function __generateConnectionLightning(weight,v1,v2,motion,signalStrength)
        {
            var dist = v1.distanceTo(v2);
            var connectGeom = new THREE.PlaneGeometry(dist/20,dist/20,1,90);
            var glowGeom = connectGeom.clone();
            var connectMat = _ribbonConnectionMats[weight];
            console.log(connectMat);
            var originP = v1;
            var connectionP = v2; 
            var i=0;
            var limit = connectGeom.vertices.length;//Math.random()*dist/30+8;
            connectGeom.vertices[0] = originP;
            connectGeom.vertices[1] = originP;
            glowGeom.vertices[0] = originP;
            glowGeom.vertices[1] = originP;
            var counter = 0;
            var spread = limit/2;
            var xDist = (v2.x - v1.x);
            var yDist = (v2.y - v1.y);
            var zDist = (v2.z - v1.z);
            for (i=2;i<limit-1;++i)
            {
                //todo increment by 2 to keep nodes next to each other 
                if (i%2!=0) counter++;
                var vect = connectGeom.vertices[i];//new THREE.Vector3();
                var vectG = glowGeom.vertices[i];
                

                    //todo: Refactor this.

/*
                     vect.x = destX;//((xDist/limit)*i);// + Math.sin((counter/4)-Math.PI/2)*(dist/20);// + Math.sin(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                vect.y = destY;//((yDist/limit)*i);// + Math.cos((counter/4)-Math.PI/2)*(dist/20);// + Math.cos(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                vect.z = destZ;//((zDist/limit)*i);// + Math.sin((counter/4)-Math.PI/2)*(dist/20);// + Math.sin(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;

                var xVariation = 0;//Math.sin((counter/4)-Math.PI/2)*(dist/1000)// + (Math.sin(counter)*dist*0.0005);
                var yVariation = 0;//Math.sin((counter/4)-Math.PI/2)*(dist/1000)// + (Math.sin(counter)*dist*0.0005);
                var zVariation = 0;//Math.sin((counter/4)-Math.PI/2)*(dist/1000)// + (Math.sin(counter)*dist*0.0005);
*/
                var conXPos = ((xDist/limit*2)*counter) + Math.sin(counter/4)*dist*0.0025 + (2 * i%2);//(dist/200) ;//+ Math.random() *2 - 1;
                var conYPos = ((yDist/limit*2)*counter) + Math.sin(counter/4)*dist*0.0025 + (2 * i%2);//(dist/200);// + Math.random() *2 - 1;
                var conZPos = ((zDist/limit*2)*counter) + Math.sin(counter/4)*dist*0.0025 + (2 * i%2);

                var glowXPos = ((xDist/limit*2)*counter) + Math.sin(counter/4)*dist*0.0025 + (2 * i%2);//(dist/200) ;//+ Math.random() *2 - 1;
                var glowYPos = ((yDist/limit*2)*counter) + Math.sin(counter/4)*dist*0.0025 + (2 * i%2);//(dist/200);// + Math.random() *2 - 1;
                var glowZPos = ((zDist/limit*2)*counter) + Math.sin(counter/4)*dist*0.0025 + (2 * i%2);
/*

                
                vectG.x = destX + xVariation// + Math.sin(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                vectG.y = destX + yVariation;//Math.cos((counter/4)-Math.PI/2)*(dist/100) + (Math.cos(counter)*dist*0.005);// + Math.cos(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                vectG.z = destX + zVariation;//Math.sin((counter/4)-Math.PI/2)*(dist/100) + (Math.cos(counter)*dist*0.005);// + Math.sin(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
*/              var initTheta = Math.sin(counter/4)*2*Math.PI + Math.random()*2-1;
                var initPhi = Math.sin(counter/4)*Math.PI + Math.random()*2-1;

                var xVariation =  2*Math.sin(initTheta)*Math.cos(initPhi);//  
                var yVariation =  2*Math.sin(initTheta)*Math.sin(initPhi);// 
                var zVariation =  2*Math.cos(initTheta); 

                vect.x = conXPos;//((xDist/limit)*i);// + Math.sin(counter/10)*(dist*0.05);// + Math.sin(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                vect.y = conYPos;//((yDist/limit)*i);// + Math.cos(counter/10)*(dist*0.05);// + Math.cos(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                vect.z = conZPos;//((zDist/limit)*i);// + Math.sin(counter/10)*(dist*0.05);// + Math.sin(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                vectG.x = glowXPos;//((xDist/limit)*i);// + Math.sin(counter/10)*(dist*0.05);// + ((i%2) - 1)*0.4;// + (Math.sin(counter/4)*dist*0.005);// + Math.sin(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                vectG.y = glowYPos;//((yDist/limit)*i);// + Math.cos(counter/10)*(dist*0.05);// + ((i%2) - 1)*0.4;// + (Math.sin(counter/4)*dist*0.005);// + Math.cos(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;
                vectG.z = glowZPos;//((zDist/limit)*i);// + Math.sin(counter/10)*(dist*0.05) ;//+ ((i%2) - 1)*0.4;// + Math.sin(i/100)*((spread>>1)-(Math.abs((spread>>1)-(counter/4))))/2;

                var initTheta = Math.sin(counter/4)*2*Math.PI + (Math.random()*2-1) * 0.25;
                var initPhi = Math.sin(counter/4)*Math.PI + (Math.random()*2-1) * 0.25;

                var xVariation =  signalStrength*Math.sin(initTheta)*Math.cos(initPhi);//  
                var yVariation =  signalStrength*Math.sin(initTheta)*Math.sin(initPhi);// 
                var zVariation =  signalStrength*Math.cos(initTheta); 

                //var xVariation =  Math.sin((counter/40)-Math.PI/2)*(dist*0.01) + (Math.sin(counter/4)*dist*0.001);
                //var yVariation = Math.cos((counter/40)-Math.PI/2)*(dist*0.01) + (Math.sin(counter/4)*dist*0.001);
                //var zVariation = Math.sin((counter/40)-Math.PI/2)*(dist*0.01);


                
                if(i==2)
                {
                    TweenMax.to(vectG,1,{x:'+='+Math.random()*2,y:'+='+Math.random()*2,z:'+='+Math.random()*2,repeat:-1,yoyo:true,onUpdate:__onFlagGeometryForUpdate,onUpdateParams:[glowGeom]});

                }
                else
                {
                    //TweenMax.to([vect,vectG],.5,{ease:Elastic.easeInOut,delay:i/10,x:'+='+(Math.sin(counter)*dist*0.05),y:'+='+(Math.sin(counter)*dist*0.05),z:'+='+(Math.sin(counter)*dist*0.05),repeat:-1,yoyo:true});
                    TweenMax.to([vect,vectG],.8,{ease:Elastic.easeInOut,delay:i/100,x:'+='+xVariation,y:'+='+yVariation,z:'+='+zVariation,repeat:-1,yoyo:true});
                    //TweenMax.to([vect,vectG],1,{ease:Elastic.easeInOut,delay:i/100,x:'+='+(Math.sin(counter/40)*dist*0.005),y:'+='+(Math.cos(counter/40)*dist*0.005),z:'+='+(Math.cos(counter/40)*dist*0.005),repeat:-1,yoyo:true});
                }
                //var xPos = ((xDist/limit)*i) + Math.sin(counter/4)*30;//(dist/200) ;//+ Math.random() *2 - 1;
                //var yPos = ((yDist/limit)*i) + Math.sin(counter/4)*30;//(dist/200);// + Math.random() *2 - 1;
                //var zPos = ((zDist/limit)*i) + Math.sin(counter/4)*30;//(dist/200) ;//+ Math.random() *2 - 1;

                //vect.x = xPos;//Math.sin(i/10)*((limit>>1)-(Math.abs((limit>>1)-i)))/2;
                //vect.y = yPos;//((yDist/limit)*i) + Math.cos(i/4)*(dist/100) + Math.random() *2 - 1;//Math.cos(i/10)*((limit>>1)-(Math.abs((limit>>1)-i)))/2;
                //vect.z = zPos;//((zDist/limit)*i) + Math.sin(i/4)*(dist/100) + Math.random() *2 - 1;//Math.sin(i/10)*((limit>>1)-(Math.abs((limit>>1)-i)))/2;
                //connectGeom.vertices[i] = vect;
          }
          connectGeom.vertices[limit-2] = connectionP;
          connectGeom.vertices[limit-1] = connectionP;
          glowGeom.vertices[limit-2] = connectionP;
          glowGeom.vertices[limit-1] = connectionP;
          //connectGeom.vertices.push(connectionP);
          //glowGeom = connectGeom.clone()
          //var mat = local.generateParticleMaterial(10);
          //var electrons = new THREE.PointCloud( connectGeom, mat );

          var connection = new THREE.Mesh(connectGeom,connectMat);
          var glow = new THREE.Mesh( glowGeom, _ribbonGlowMat.clone() );
            //glow.material.side = THREE.DoubleSide;
            //glow.scale.multiplyScalar(1.02);
            //_glows.push(glow);
            _electrifiedGlows.push(glow);
            connection.add( glow );

          //connection.add(electrons);
          return connection;
        }

        function __generateConnectionTube(color,additive,v1,v2)
        {
            var dist = v1.distanceTo(v2);
            var points = [];
            for ( var i = 0; i < 3; i ++ ) {
                points.push( new THREE.Vector3( Math.sin( i * 0.2 ) * 15 + 50, 0, ( i - 5 ) * 2 ) );

            }
            var geometry = new THREE.LatheGeometry( points, 3 );
            var material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
            var lathe = new THREE.Mesh( geometry, material );

            //scene.add( lathe );

            var connectGeom = geometry;//new THREE.CylinderGeometry
            //var connectGeom = new THREE.PlaneGeometry(0.001,dist/20,1,40);
            var connectMat = _baseRibbonConnectionMat;//__generateRibbonMaterial(color);
            console.log(connectMat);
            var originP = v1;
            var connectionP = v2; 
            var i=0;
            var limit = connectGeom.vertices.length;//Math.random()*dist/30+8;
            connectGeom.vertices[0] = v2;
            connectGeom.vertices[3] = v2;

            var counter = 0;

          var connection = new THREE.Mesh(connectGeom,connectMat);
          //connection.add(electrons);
          return connection;
        }

        ///////////////
        // Geometry generation functions

        function __generateAttributeGeometry(nodes, range) {
            var geometry = new THREE.Geometry();
            if (nodes === undefined) nodes = 100;
            nodes = Math.floor(nodes);
            if (range === undefined) range = 500;
            var tweenArr = [];
            var groupVelocity = Math.random()*6+0.2; 
            //local.particleGroupVelocity.push(groupVelocity);
            //local.particleTweens[systemID] = tweenArr;
            for ( i = 0; i < nodes; i ++ ) {

            var vertex = new THREE.Vector3();  
            
            var theta = Math.random()*2*Math.PI;
            var phi = Math.random()*Math.PI;
            
            var initX =  range*Math.cos(theta)*Math.cos(phi);//  
            var initY =  range*Math.sin(theta)*Math.sin(phi);// 
            var initZ =  range*Math.cos(theta); 

            vertex.x = initX;
            vertex.y = initY;
            vertex.z = initZ;
            geometry.vertices.push( vertex );
        
            }
            return geometry;
        }


        function __generateParticleGeometry(nodes, range, variation) {
          var geometry = new THREE.Geometry();
          if (nodes === undefined) nodes = 100;
          nodes = Math.floor(nodes);
          if (range === undefined) range = 500;
          if (variation === undefined) variation = 0;
          var tweenArr = [];
          var groupVelocity = Math.random()*6+0.2; 
          //local.particleGroupVelocity.push(groupVelocity);
          //local.particleTweens[systemID] = tweenArr;
          for ( i = 0; i < nodes; i ++ ) {

            var vertex = new THREE.Vector3();  
            
            var initTheta = Math.random()*2*Math.PI;
            var initPhi = Math.random()*Math.PI;
            var theta = initTheta;
            var phi = initPhi;

            var varFactor = Math.random()*variation-(variation>>1);
            
            var initX =  (varFactor+range)*Math.sin(initTheta)*Math.cos(initPhi);//  
            var initY =  (varFactor+range)*Math.sin(initTheta)*Math.sin(initPhi);// 
            var initZ =  (varFactor+range)*Math.cos(initTheta); 

            vertex.x = initX;
            vertex.y = initY;
            vertex.z = initZ;
            geometry.vertices.push( vertex );
            
            }
          return geometry;
        }


        function __generateSphereGeometry(radius,complexity,variation)
        {
          //var geometry = new THREE.SphereGeometry( radius, complexity, complexity );
          console.log(complexity)
          var geometry = new THREE.OctahedronGeometry(radius,complexity);
          //console.log(geometry);
          if (variation > 0)
            {
              /*for(var i=0; i < geometry.faces.length; ++i){
                var hex = _colorManager.getNetworkMeshColor();//0x232334;//0x040421;////Math.sin(i/100000000) * 0xffffff;
               // var hex = 0xff0000;
               // geometry.faces[ i ].color.setHex( hex );
               // geometry.faces[ i + 1 ].color.setHex( hex );
                //console.log(geometry.faces[ i ].a+'  '+geometry.faces[ i ].b+'  '+geometry.faces[ i ].c);
              }*/
              for (var i=0; i <geometry.vertices.length; ++i)
              {
                var vert = geometry.vertices[i];
                vert.x += Math.random()*variation-(variation>>1);
                vert.y += Math.random()*variation-(variation>>1);
                vert.z += Math.random()*variation-(variation>>1);

                var mRange = variation*0.5;
                if(i == 0)
                {
                    //TweenMax.to(vert,144,{x:vert.x+Math.random()*mRange-(mRange>>1),y:vert.y+Math.random()*mRange-(mRange>>1),z:vert.z+Math.random()*mRange-(mRange>>1),yoyo:true,repeat:-1,onUpdate:__onSphereGeometryUpdate,onUpdateParams:[geometry], ease:Linear.easeNone});
                }
                else
                {
                    //TweenMax.to(vert,Math.random()*40+100,{x:vert.x+Math.random()*mRange-(mRange>>1),y:vert.y+Math.random()*mRange-(mRange>>1),z:vert.z+Math.random()*mRange-(mRange>>1),yoyo:true,repeat:-1, ease:Linear.easeNone});
                }
              }
            }
          return geometry;
        }

        function __onSphereGeometryUpdate(geom)
        {
            geom.verticesNeedUpdate = true;
        }

        function __generateNodeGlowGeometry(radius, complexity,type)
        {
            var geometry = new THREE.IcosahedronGeometry(radius,complexity);
            return geometry;
        }

        function __generateMetaVerse(radius,complexity,wireframe,variation)
        {
            var metaVerse = __generateSphereSystem(radius,complexity,wireframe,variation);
            return metaVerse;
        }

        function __generateSky()
        {
            var mat = new THREE.MeshBasicMaterial( { 
                color: _colorManager.getBackgroundSceneColor(), 
                fog:false , side:THREE.BackSide//, 
                //ambient: _colorManager.getBackgroundSceneAmbientColor(),
                //specular:_colorManager.getBackgroundSceneSpecularColor(),
                //shininess: _colorManager.getBackgroundSceneShininess()
                } );//new THREE.MeshBasicMaterial({color:'#eeeeee',face:THREE.BackSide,fog:false});
            var geom = __generateSphereGeometry(15000,1,0);;//local.generateParticleGeometry(10000,1000);//
            var sphere = new THREE.Mesh(geom, mat);
            return sphere;
        }

        function __generateSphereSystem(radius,complexity,wireframe,variation)
        {
            var mat = __generateSphereMaterial(wireframe,variation,true);
            var geom = __generateSphereGeometry(radius*4,4,variation*4);//local.generateParticleGeometry(10000,1000);//

            var sphere = new THREE.Mesh(geom, mat);
            _scene.add(sphere);

            var i=0;
            var limit = 9;
            for (i=0;i<limit;++i)
            {
                if (i<2)
                {
                    var pGeom = __generateSphereGeometry(radius*2,complexity,variation*2);
                    var pMat = _nodePartMat.clone();
                }
                else if(i>2 && i < 7)
                {
                    var pGeom = __generateSphereGeometry(radius*5,complexity-1,variation*3);
                    var pMat = _nodePartMat.clone();
                }
                else if(i> 7)
                {
                    var pGeom = __generateSphereGeometry(radius*i,complexity-2,variation);
                    var pMat = _distantNodePartMat.clone();
                }
                _particleGeomsArray.push(pGeom);
                //__generateParticleGeometry(3000,5000,2000);
                // path to the texture
                var texturePath = 'assets/images/theme-' +
                    window.nara.theme +
                    '/node-' +
                    ( i + 1 ) +
                    '.png';
                pMat.map = THREE.ImageUtils.loadTexture(texturePath);
                var parts = new THREE.PointCloud(pGeom,pMat);//_particleShaderMaterial);//_nodePartMat);
                var particles = [];
                var p=0;
                var pLimit = parts.geometry.vertices.length
                for(p=0;p<pLimit;++p) {
                    // set alpha randomly
                    _particleShaderMaterial.attributes.alpha.value[ p ] = Math.random();
                    particles = parts.geometry.vertices[p];
                }
                _particleShaderMaterial.attributes.aPoints.value = particles;
                parts.sortParticles = true;
                sphere.add(parts);
            }

            return sphere;
        }


        /////////////////////////////////
        // Attribute Creation
        ////////////////////////


        /**
         * __generateAttribute takes a NodeAttribute object and constructs
         * a THREE.Object3D object; then adds it to the THREE.js visual node.
         *
         * @param NodeAttribute A node attribute object e.g. cuisine.
         * @return THREE.Object3D object to be rendered to the display.
         */
        function __generateAttribute(attrData)
        {
            var mat;
            var geom;
            var node;
            var container = attrData.getParent().getVisualNode();
            var parent = attrData.getParent();

            var attribute = new THREE.Object3D();//THREE.PointCloud( geom, mat );  
            attribute.nodeData = attrData;

            var material = new THREE.MeshLambertMaterial({
                color:'#ffffff',//+Math.floor(Math.random()*16777215).toString(16), //678967
                //blending:THREE.AdditiveBlending,
                shading: THREE.SmoothShading,
                //side:THREE.FrontSide,
                wireframe:false
            });

            //var connection = __linkNodes(0.5,false,container,attribute)

            var rnd = 1;//Math.floor(Math.random()*2);
            var tier = attrData.getTier();
            ////////////////
            //CLUMPING

            var coreSize = container.coreSize*((tier == 0) ? 0.15 : 1.55);//Math.random()*2+2;
            var coreRange =  container.coreSize*1.4*(tier+1)*(tier+1);

            ////////////////
            // BRANCHING

            var mat = material;//_attributeTextureMat;//material;//(type==1) ? _wireframeMat : _wireframeMat;
            var innerCore = new THREE.Object3D();//THREE.Mesh( geom, mat);
            attribute.add(innerCore);
            attribute.coreRange = coreRange;
            attribute.innerCore = innerCore;
            attribute.coreSize = coreSize;

            theta = /*(container.theta !== undefined) ? container.theta :*/ Math.random()*2*Math.PI;
            phi =/* (container.phi !== undefined) ? container.phi : */attrData.getOrder()/*Math.random()*/*Math.PI;
            var range = coreRange;//attribute.coreRange;// + 10;
            var initX =  range*Math.sin(theta)*Math.cos(phi);//  
            var initY =  range*Math.sin(theta)*Math.sin(phi);// 
            var initZ =  range*Math.cos(theta); 
            attribute.position.x = initX;//Math.random()*1000-500;
            attribute.position.y = initY;//Math.random()*1000-500;
            attribute.position.z = initZ;//Math.random()*1000-500;

            attribute.theta = theta;
            attribute.phi = phi;


            //TweenMax.from(attribute.position,1,{delay:tier+1,x:0,y:0,z:0})
            container.add(attribute);

            //branching
            var connection = __linkAttributes(null,true,container,attribute,0.5)
            attribute.connection = connection;
            //attribute.add(connection);

            attrData.setVisualNode(attribute);

            // for mouseover function on attributes;
            //_targetList.push(attribute.innerCore);

            return attribute;
        }


        ////////////////////////////////
        //  Node Creation
        ////////////////////////

        function __generateNode(range,nodeData,x,y,z)
        {
            var node;
            var container = _scene;

            node = new THREE.Object3D();//THREE.PointCloud( geom, mat );  

            node.coreRange = _metaVerseRange;//range;

            var type = (nodeData.getType() === 'entity') ? 1 : 0;
            var coreSize = Math.random()*10+30;
            var rnd = 0;//Math.floor(Math.random()*2);

            var mat = _entityNodeMat;//(type===0) ?_userNodeMat : _entityNodeMat;//_nodeTextureMat;//(type==1) ? _wireframeMat : _wireframeMat;
            var innerCore = new THREE.Object3D();//new THREE.Mesh( geom, mat);
            node.add(innerCore);

            node.innerCore = innerCore;
            node.coreSize = coreSize;
            if (x !== undefined)
            {
                var initX = x;
                var initY = y;
                var initZ = z;
            }
            else
            {
                theta = Math.random()*2*Math.PI;
                phi = Math.random()*Math.PI;
                var range = Math.random()*node.coreRange + 700;
                var initX =  range*Math.sin(theta)*Math.cos(phi);//  
                var initY =  range*Math.sin(theta)*Math.sin(phi);// 
                var initZ =  range*Math.cos(theta); 
            }

            node.position.x = initX;//Math.random()*1000-500;
            node.position.y = initY;//Math.random()*1000-500;
            node.position.z = initZ;//Math.random()*1000-500;
            node.targetVector = node.position.clone();

            container.add(node);

            return node;
        };


        /**
         * __
         */
        function __activateNodeModel(nodeData)
        {
            var node = nodeData.getVisualNode();

            if (!node.glow)
            {
                var material,
                    glow,
                    label,
                    labelPostionX,
                    labelPostionY,
                    labelPostionZ,
                    labelText;
                // ToDo: use MeshLambertMaterial if you want it to reflect light
                material = new THREE.MeshBasicMaterial( {
                    color: 0xffffff
                } );

                glow = new THREE.Mesh( __generateNodeGlowGeometry(20,2,0), material );
                glow.material.side = THREE.FrontSide;
                glow.scale.multiplyScalar(0.85);

                // ToDo: Position the x, y z of the label
                // create the label text
                // create the label postion
                labelPositionX = glow.position.x + 3;
                labelPositionY = glow.position.y + 11;
                labelPositionZ = Math.ceil( glow.position.z ) - glow.position.z;
                labelText = ' ' + nodeData.name + ' ';
                // draw the label
                label = __createTextSprite( labelText, {
                    borderThickness: 1,
                    fontface: 'Helvetica',
                    fontsize: 24,
                    borderColor: {r:255, g:255, b:255, a:0.25},
                    backgroundColor: {r:255, g:255, b:255, a:0.75}
                } );
                label.position.set(labelPositionX, labelPositionY, labelPositionZ);

                // Glow only
                _glows.push(glow);
                node.add( glow );
                node.glow = glow;
                // label too
                node.add( label );
            }
        }

        //////////////////////////////
        ///   Animation and rendering functions

        function __animate()// = function()
        {
          requestAnimationFrame( __animate );
          __update();
        };


        /**
        * Init the depth of field post processing scene
        */
        function __initPostProcessing() {

            _bokehParams = {
                shaderFocus : false,
                fstop       : 2.6 * 3,
                maxblur     : 3.0,
                showFocus   : false,
                focalDepth  : 20.2,
                manualdof   : false,
                vignetting  : false,
                depthblur   : true,

                threshold   : 0.5,
                gain        : 0.1,
                bias        : 0.7,
                fringe      : 0.5,

                focalLength : 35,
                noise       : true,
                pentagon    : true,

                dithering   : 0.00001
            };
            _postProcessing = {};



            _postProcessing.scene  = new THREE.Scene();
            _postProcessing.camera = new THREE.OrthographicCamera( -window.innerWidth / 2, window.innerWidth / 2, window.innerHeight / 2, -window.innerHeight / 2, -60, 60 );
            _postProcessing.scene.add( _postProcessing.camera );

            /* Rendering to color and depth textures */
            var params = {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format   : THREE.RGBFormat
            };

            /* Preparing the frame buffers to be rendered to */
            _postProcessing.rtTextureDepth = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, params );
            _postProcessing.rtTextureColor = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, params );

            var bokeh_shader = THREE.BokehShader;
            _postProcessing.bokeh_uniforms = THREE.UniformsUtils.clone( bokeh_shader.uniforms );
            _postProcessing.bokeh_uniforms["tColor"].value = _postProcessing.rtTextureColor;
            _postProcessing.bokeh_uniforms["tDepth"].value = _postProcessing.rtTextureDepth;

            _postProcessing.bokeh_uniforms["textureWidth" ].value = window.innerWidth;
            _postProcessing.bokeh_uniforms["textureHeight"].value = window.innerHeight;

            _postProcessing.materialBokeh = new THREE.ShaderMaterial( {
                uniforms        : _postProcessing.bokeh_uniforms,
                vertexShader    : bokeh_shader.vertexShader,
                fragmentShader  : bokeh_shader.fragmentShader,
                defines: {
                    RINGS   : 3,
                    SAMPLES : 2
                }
            } );

            _postProcessing.quad = new THREE.Mesh( new THREE.PlaneGeometry( window.innerWidth, window.innerHeight ), _postProcessing.materialBokeh );
            _postProcessing.scene.add( _postProcessing.quad );
        }

        function __update()
        {
            //_scene.updateMatrixWorld();
            //_particleShaderMaterialuniforms.time.value += delta * 10;
            __checkForIntersections('passive')


            //_particleShaderMaterial.uniforms.fogDensity.value = _scene.fog.density;
            for( var i = 0; i < _particleShaderMaterial.attributes.alpha.value.length; i ++ ) {
                // dynamically change alphas
                _particleShaderMaterial.attributes.alpha.value[ i ] *= 0.995;
                if ( _particleShaderMaterial.attributes.alpha.value[ i ] < 0.05 ) { 
                    _particleShaderMaterial.attributes.alpha.value[ i ] = 1.0;
                }
            }

            _particleShaderMaterial.attributes.alpha.needsUpdate = true; // important!

            var i=0;
            var limit = _labelsArray.length;
            for(i=0;i<limit;++i)
            {
                var label = _labelsArray[i];
                label.updateMatrixWorld();
                label.parent.updateMatrixWorld();
                var localCamVector = label.parent.worldToLocal(_camera.position.clone())
                label.lookAt(localCamVector);
            }



            var i=0;
            var limit=_glows.length;
            _camera.updateMatrixWorld();
            for(i=0;i<limit;++i)
            {
                // localtoworld coordinate issue.  nested objects are basing their location off of the root.
                var nodeGlow = _glows[i]; 
                nodeGlow.updateMatrixWorld();
                nodeGlow.parent.updateMatrixWorld();
                var rndVector = new THREE.Vector3(Math.random()*_metaVerseRange*2-_metaVerseRange,Math.random()*_metaVerseRange*2-_metaVerseRange,Math.random()*_metaVerseRange*2-_metaVerseRange);
                var cameraLocalVect = nodeGlow.parent.worldToLocal(_camera.position.clone())
                // ToDo: Remove these because we dont need the cloud material
                // _glows[i].material.uniforms.viewVector.value = new THREE.Vector3().subVectors( cameraLocalVect, _glows[i].position );
            }
            limit = _electrifiedGlows.length;
            for(i=0;i<limit;++i)
            {
                // localtoworld coordinate issue.  nested objects are basing their location off of the root.
                var electricGlow = _electrifiedGlows[i]; 
                var rndVector = new THREE.Vector3(Math.random()*_metaVerseRange*2-_metaVerseRange,Math.random()*_metaVerseRange*2-_metaVerseRange,Math.random()*_metaVerseRange*2-_metaVerseRange);
                // ToDo: Remove these because we dont need the cloud material
                // _electrifiedGlows[i].material.uniforms.viewVector.value = new THREE.Vector3().subVectors( rndVector, _electrifiedGlows[i].position.clone() );
            }

            // Patch to fix issue where connection geometries disappear if the mesh's initial position is behind the camera.
            //TODO: Update to only check connections that are incoming connections to activeNode;
            if (_cameraZoom < 500)
            {
                var i=0;
                var limit = _connectionsArray.length;
                for (i=0;i<limit;++i)
                {
                    var connectionGeom = _connectionsArray[i].geometry;
                    connectionGeom.computeBoundingSphere();
                }
                // same deal as above just ued to check particle clouds positions.
                var i=0;
                var limit = _particleGeomsArray.length;
                for (i=0;i<limit;++i)
                {
                    var geom = _particleGeomsArray[i];
                    geom.computeBoundingSphere();
                }
            }
            if (Math.abs(_camera.position.z) > 10000)
            {
                var i=0;
                var limit = _connectionsArray.length;
                for (i=0;i<limit;++i)
                {
                    var connection = _connectionsArray[i];
                    connection.visible = false;
                }
            }
            else
            {
                var i=0;
                var limit = _connectionsArray.length;
                for (i=0;i<limit;++i)
                {
                    var connection = _connectionsArray[i];
                    connection.visible = true;
                }
            }

            __render();
        }


        function __render()
        {
            var time = Date.now() * 0.00005;

            _particleShaderMaterial.uniforms.texture.value = _particleShaderMaterial.uniforms.texture_point.value

            //local.checkTargetPosition();
            _camera.lookAt(_cameraTarget.position);
            _renderer.clear(false,true,false);
            _renderer.autoClear = false;
            //_renderer.clear();
            _renderer.render( _scene, _camera );
        };



        return {
            INITIALIZE : INITIALIZE,
            NODE_INITIALIZED : NODE_INITIALIZED,
            NODE_TARGETTED : NODE_TARGETTED,
            ATTRIBUTE_ROLL_OVER : ATTRIBUTE_ROLL_OVER,
            ATTRIBUTE_SELECTED : ATTRIBUTE_SELECTED,
            init : init,
            revealNetwork : revealNetwork,
            setFogLevel : setFogLevel,
            createNode : createNode,
            createNodes : createNodes,
            targetNode : targetNode,
            activateNode : activateNode,
            simulateNodeConstruction : simulateNodeConstruction,
            isolateNode : isolateNode,
            connectNode : connectNode,
            clusterNodes : clusterNodes,
            clusterNode : clusterNode,
            moveCameraTargetToNode : moveCameraTargetToNode,
            connectAllNodes : connectAllNodes,
            displayConnection : displayConnection,
            highlightConnection : highlightConnection,
            addNodeToStage : addNodeToStage,
            removeNodeFromStage : removeNodeFromStage,
            spinCamera : spinCamera,
            zoomCamera : zoomCamera
        };
    })
})();