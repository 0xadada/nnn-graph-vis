(function() {
    app.controller('CoreCtrl', function ($scope, DataNode, NodeDataManager, NodeFactory, Visualizer, ColorManager) {

        $scope.users = [];
        $scope.nodes = [];
        $scope.activeNodeConnections = [];
        $scope.activeNode;
        $scope.activeAttribute;
        $scope.inputNodeID = 1553718;
        $scope.fogDepthValue = 0.0003;
        $scope.zoomLevel = 10000;
        // variables for interactive animation / playback
        $scope.isPaused = true;
        $scope.animationBegan = false;

        $scope.init = function() {
            $scope.createNodeDataManager();
            $scope.createColorManager();
            $scope.createVisualizer();
            // bind keyboard events to our key handler
            $( 'body' ).on( 'keypress', function( event ) {
                $scope.onKeypress( event );
            } );
        }

        $scope.createNodeDataManager = function() {
            $scope.nodeDataManager = new NodeDataManager($scope);
            $scope.$on(NodeDataManager.DATA_PARSED, $scope.onDataParsed);
        }

        $scope.createColorManager = function() {
            $scope.colorManager = new ColorManager($scope);
        }

        $scope.createVisualizer = function() {
            $scope.$on(Visualizer.NODE_TARGETTED,$scope.onNodeTargetted);
            $scope.$on(Visualizer.ATTRIBUTE_SELECTED,$scope.onAttributeSelected);
            $scope.$on(Visualizer.ATTRIBUTE_ROLL_OVER,$scope.onAttributeRollOver);
            Visualizer.init($scope,$scope.nodeDataManager,$scope.colorManager);
        }

        /**
         * onKeypress toggles the demo animation play/pause interactions
         * based on the space bar key.
         *
         * @param Event the keyboard event.
         * @return void.
         */
        $scope.onKeypress = function( event ) {
            if (event.which === /* Space */ 32) {
                // begin animation if not started yet.
                if( $scope.animationBegan === false ) {
                    $scope.demoMode();
                }
                // else toggle playback
                else {
                    // if paused, play
                    if ( $scope.isPaused === true ) {
                        console.debug( 'Resumed' );
                        TweenMax.resumeAll();
                    }
                    // else pause
                    else {
                        console.debug( 'Paused' );
                        TweenMax.pauseAll();
                    }
                    // toggle internal playback state
                    $scope.isPaused = !$scope.isPaused;
                }
            }
        }

        /**
         * demoMode hides the connect button and makes a call
         * to begin loading the graph JSON data.
         *
         * @return void.
         */
        $scope.demoMode = function() {
            // fade out connect button
            TweenMax.to('.start_button', 0.5, { autoAlpha : 0 })
            // load data, which will kickoff $scope.demoAnimation
            $scope.getGraphData();
        }

        /**
         * demoAnimation programatically animates a timeline of story events
         * over time using the TweenMax animation library.  It also provides
         * a way to "source select" which movie to run.
         *
         * @return void.
         */
        $scope.demoAnimation = function() {
            // Here is where you can set different movie sequences to run
            // when you click the "Connect" button.
            //
            // Eventually it can be made more sophisticated, using keyboard
            // input or other mechanisms to select which scene to play.
            var scene_to_run = 3;
            if(scene_to_run == 0) {
                $scope.demoAnimationBEAM();
            } else if(scene_to_run == 1) {
                $scope.scene1();
            } else if(scene_to_run == 2) {
				$scope.scene2();
            } 
            else if(scene_to_run == 3) {
				$scope.scene3();
            }
        }

        /**
         * tees up an event to make a node appear during the movie
         *
         * @param int t the absolute time in the movie for which to fire the event.
         * @param int node_id the id of the node, which should already be loaded into memory.
         * @param int x the x coordinate for the node's desired position.
         * @param int y the y coordinate for the node's desired position.
         * @param int z the z coordinate for the node's desired position.
         *
         * @return void.
         */
        $scope.drawNode = function(t, node_id, x, y, z) {
            var nodeData = $scope.getNodeDataByID(node_id);
            TweenMax.delayedCall(t,$scope.createNode,[nodeData,x,y,z]);
            TweenMax.delayedCall(t,Visualizer.activateNode,[nodeData,true]);
        }

        /**
         * tees up an event to move to a node during the movie
         * 
         * @param int t the absolute time in the movie for which to fire the event.
         * @param int node_id the id of the node, which should already be loaded into memory.
         * @param int move_time the time in seconds that it should take to complete the move.
         * @param boolean used_curve_path whether to fly straight to the node (false) or do a curve (true)
         *
         * @return void.
         */
        $scope.moveToNode = function(t, node_id, move_time, use_curved_path) {
            TweenMax.delayedCall(t,$scope.locateNode,[node_id,move_time,use_curved_path]);
        }

        /**
         * tees up an event to make a connection appear during the movie
         *
         * @param int t the absolute time in the movie for which to fire the event.
         * @param int node_id the id of the node that is the source of the connection
         * @param int connection_number the id of the node's connection (starting at 0) to draw
         *
         * @return void.
         */
        $scope.showConnection = function(t, node_id, connection_number) {
            var node = $scope.nodeDataManager.nodesHash[node_id];
            var connection = node.connections[connection_number];
            TweenMax.delayedCall(t,Visualizer.showConnection,[connection,true]);
        }

        /**
         * tees up an event to make a connection appear during the movie
         *
         * @param int t the absolute time in the movie for which to fire the event.
         * @param int node_id the id of the node that is the source of the connection
         * @param int connection_number the id of the node's connection (starting at 0) to draw
         *
         * @return void.
         */
        $scope.animateConnection = function(t, node_id, connection_number) {
            var node = $scope.nodeDataManager.nodesHash[node_id];
            var connection = node.connections[connection_number];
            if (connection.getVisualConnection() !== undefined) {
                Visualizer.highlightConnection(connection);
            }
        }

        /**
         * Animates a single node visually by opacity.
         *
         * @param int nodeId the id of the node that is to be animated.
         * @return void.
         */
        $scope.animateNode = function(t, node_id, red, green, blue) {
            var node = $scope.nodeDataManager.nodesHash[node_id],
                node3D = node.getVisualNode();
            if ( node3D !== undefined) {
                Visualizer.highlightNode( node3D, red, green, blue );
            }
        }

        /**
         * this is one animation that we can call from demoAnimation()
         * it was designed by BEAM
         *
         * @return void.
         */
        $scope.demoAnimationBEAM = function() {
            // begin playback
            $scope.isPaused = false;
            $scope.animationBegan = true;

            // begin animation
            TweenMax.delayedCall(1,$scope.locateNode,[1553718,8,true]);

            TweenMax.delayedCall(5,Visualizer.setFogLevel,[0.001,3]);
            TweenMax.delayedCall(8,Visualizer.spinCamera,[10]);

            TweenMax.delayedCall(10,$scope.demoLocateNodeConnection);
            /* new: */ TweenMax.delayedCall(15,$scope.highlightNode);
            TweenMax.delayedCall(20,$scope.demoLocateNodeConnection);

            TweenMax.delayedCall(30,$scope.locateNode,[1553718,4,false]);
            // TweenMax.delayedCall(23,$scope.highlightConnection,[1017]);
            TweenMax.delayedCall(33,Visualizer.spinCamera,[10]);
            TweenMax.delayedCall(31,$scope.branchNode,[1553718,7])

            TweenMax.delayedCall(36,Visualizer.zoomCamera,[3000,10])
            TweenMax.delayedCall(36,Visualizer.setFogLevel,[0.0002,10]);
            TweenMax.delayedCall(45.5,Visualizer.spinCamera,[10]);

            TweenMax.delayedCall(46,$scope.setActiveNode,[202,3000,-1000,500])
            TweenMax.delayedCall(46,$scope.branchNode,[202,7]);

            TweenMax.delayedCall(52,Visualizer.zoomCamera,[6000,10]);
            TweenMax.delayedCall(52,Visualizer.setFogLevel,[0.00004,10]);

            TweenMax.delayedCall(58,$scope.createNode,[$scope.getNodeDataByID(1),-6200,3000,3100])
            TweenMax.delayedCall(58,$scope.branchNode,[1,4]);
            TweenMax.delayedCall(59,$scope.setActiveNode,[1])

            TweenMax.delayedCall(58,$scope.createNode,[$scope.getNodeDataByID(690),3200,-3000,-3100])
            TweenMax.delayedCall(58,$scope.branchNode,[690,4]);
            TweenMax.delayedCall(59,$scope.setActiveNode,[690])
            TweenMax.delayedCall(61,Visualizer.spinCamera,[10]);
            TweenMax.delayedCall(66,Visualizer.zoomCamera,[11000,10]);
            TweenMax.delayedCall(66,Visualizer.setFogLevel,[0.00002,10]);

            TweenMax.delayedCall(67,$scope.createNode,[$scope.getNodeDataByID(631), 200,-2000,100])
            TweenMax.delayedCall(68,$scope.branchNode,[631,7]);

            TweenMax.delayedCall(72,$scope.setActiveNode,[631, -1000,5000,-3100])
            TweenMax.delayedCall(72,$scope.branchNode,[631,7]);
            TweenMax.delayedCall(74,$scope.setActiveNode,[1553718])
            TweenMax.delayedCall(75,Visualizer.spinCamera,[30]);
            TweenMax.delayedCall(102,$scope.locateNode,[1553718,6,true]);

            TweenMax.delayedCall(107,Visualizer.spinCamera,[10]);
            TweenMax.delayedCall(108,Visualizer.setFogLevel,[0.0006,6]);
        }

        /**
         * this is another animation that we can call from demoAnimation()
         * it was designed by Nara, to depict the first network in the storyboard.
         *
         * @return void.
         */
        $scope.scene1 = function() {
            // start the timer
            t = 0;

            // Reveal network
            TweenMax.delayedCall(t,Visualizer.setFogLevel,[0.001,1]);

            // start at a restaurant node
            t = t + 0.2;
            node_id = 1;
            move_time = 2;
            use_curved_path = true;
            $scope.drawNode(t, node_id, 500, 500, 500);
            $scope.moveToNode(t, node_id, move_time, use_curved_path);
            t = t + move_time + 1;

            // move to movie node
            t = t + 0.2;
            node_id = 1000001;
            move_time = 4;
            use_curved_path = true;
            $scope.drawNode(t, node_id, 0, 0, 0);
            $scope.moveToNode(t, node_id, move_time, use_curved_path);
            t = t + move_time + 1;

            // place the connected nodes
            $scope.drawNode(t, 1000002, 0, 125, 0);
            $scope.drawNode(t, 1000003, 90, 90, 0);
            $scope.drawNode(t, 1000004, 125, 0, 0);
            $scope.drawNode(t, 1000005, 90, -90, 0);
            $scope.drawNode(t, 1000006, 0, -125, 0);
            $scope.drawNode(t, 1000007, -90, -90, 0);
            $scope.drawNode(t, 1000008, -125, 0, 0);
            $scope.drawNode(t, 1000009, -90, 90, 0);
            $scope.drawNode(t, 1000010, -220, -55, 0);

            // reviewer and movies
            $scope.drawNode(t, 1000011, 170, 75, 0);
            $scope.drawNode(t, 1000012, 250, 75, 0);
            $scope.drawNode(t, 1000013, 170, 150, 0);

            // purchase and movies
            $scope.drawNode(t, 1000014, 170, -75, 0);
            $scope.drawNode(t, 1000015, 250, -75, 0);
            $scope.drawNode(t, 1000016, 170, -170, 0);
            $scope.drawNode(t, 1000017, 240, -140, 0);

            // Webpage and movies
            $scope.drawNode(t, 1000018, -170, 75, 0);
            $scope.drawNode(t, 1000019, -250, 75, 0);
            $scope.drawNode(t, 1000020, -170, 150, 0);

            // inhibition from attribute 1000007
            $scope.drawNode(t, 1000021, -90, -165, 0);
            $scope.drawNode(t, 1000022, -130, -215, 0);
            $scope.drawNode(t, 1000023, -50, -215, 0);        

            // zoom out
            t_effect = t;
            t_effect = t_effect + 1;
            TweenMax.delayedCall(t_effect,Visualizer.zoomCamera,[500,1]);

            // do a spin
            t_effect = t_effect + 2;
            TweenMax.delayedCall(t_effect,Visualizer.spinCamera,[2]);

            // do a spin
            t_effect = t_effect + 2;
            TweenMax.delayedCall(t_effect,Visualizer.spinCamera,[2]);

            // show connections
            $scope.showConnection(t, 1000001, 0);
            $scope.showConnection(t, 1000001, 1);
            $scope.showConnection(t, 1000001, 2);
            $scope.showConnection(t, 1000001, 3);
            $scope.showConnection(t, 1000001, 4);
            $scope.showConnection(t, 1000001, 5);
            $scope.showConnection(t, 1000001, 6);
            $scope.showConnection(t, 1000001, 7);

            // attribute to movie
            $scope.showConnection(t, 1000008, 0);

            // reviewer and connections
            $scope.showConnection(t, 1000001, 8);
            $scope.showConnection(t, 1000011, 0);
            $scope.showConnection(t, 1000011, 1);

            // purchase and connections
            $scope.showConnection(t, 1000001, 9);
            $scope.showConnection(t, 1000014, 0);
            $scope.showConnection(t, 1000014, 1);
            $scope.showConnection(t, 1000014, 2);

            // webpage and connections
            $scope.showConnection(t, 1000001, 10);
            $scope.showConnection(t, 1000018, 0);
            $scope.showConnection(t, 1000018, 1);

            // inhibitory connections
            $scope.showConnection(t, 1000007, 0);
            $scope.showConnection(t, 1000021, 0);
            $scope.showConnection(t, 1000021, 1);

            // highlight a connection
            t = t + 6;
            TweenMax.delayedCall(t,$scope.animateConnection,[t,1000001,0]);
            t = t + 2;
            TweenMax.delayedCall(t,$scope.animateNode,[t,1000002]);
        }

        /**
         * this is another animation that we can call from demoAnimation()
         * it was designed by Nara, to depict the first network in the storyboard.
         *
         * @return void.
         */
        $scope.scene3 = function() {
            // start the timer
            t = 0;

            // Reveal network
            TweenMax.delayedCall(t,Visualizer.setFogLevel,[0.001,1]);
            
            // move to movie node
            node_id = 1000001;
            move_time = 0.2;
            use_curved_path = true;
            $scope.drawNode(t, node_id, 0, 0, 0);
            $scope.moveToNode(t, node_id, move_time, use_curved_path);
            t = t + move_time;

			// draw node 2
            $scope.drawNode(t, 1000002, 0, 100, 0);
            
            // show connections
            $scope.showConnection(t, 1000001, 0);

			// zoom out
            TweenMax.delayedCall(t,Visualizer.zoomCamera,[500,0.2]);
			t = t + 0.2;

            // highlight a connection
            t = t + 2;
			red = ( 0 * 0.001 );
			green = ( 0 * 0.001 );
			blue = ( 777 * 0.001 );
			duration = 1.0;
            TweenMax.delayedCall(t,$scope.animateNode,[t,1000002, duration, red, green, blue]);
        }

        /**
          * demoLocateNodeConnection animates by focusing on the currently active node
          * visually focuses on the connection, shifts focus to the node to
          * connect to, then spins the camera.
          * @return void.
          */
        $scope.demoLocateNodeConnection = function() {
            var connection = $scope.activeNode.getConnections()[0];
            console.log('framework.js', 'demoLocateNodeConnection', connection);
            $scope.displayConnection(connection);
            TweenMax.delayedCall(2,$scope.locateNode,[connection.getConnectionNode(),5,false]);
            TweenMax.delayedCall(6,Visualizer.spinCamera,[5]);
            $scope.$apply();
        }

        /**
         * createNode an alias for the Visualizer node create.
         *
         * @param NodeData Object nodeData data about the node.
         * @param Optional x, y, z coordinates.
         */
        $scope.createNode = function(nodeData, x, y, z) {
            // check if it is already created in the visualizer
            if(nodeData.getVisualNode() === undefined) {
                // create new visualizer node
                Visualizer.createNode(nodeData, x, y, z);
            }
        }

        /**
         * highlightConnection takes the currently active node and
         * a visuall-connected node ID and animates the connection between
         * them.
         *
         * @param Number nodeId the node id connected to the active node to hightlight its connection.
         * @return void.
         */
        $scope.highlightConnection = function( /* Number */ nodeId ) {
            // get the first connection
            var activeNode = $scope.activeNode;
            var connection = activeNode.getConnectionByID(nodeId);
            if (connection.getVisualConnection() !== undefined) {
                Visualizer.highlightConnection(connection);
            }
        }

        /**
         * highlightNode takes the currently active node and
         * animates the node.
         *
         * @param Number nodeId the node id to highlight.
         * @return void.
         */
        $scope.highlightNode = function() {
            var activeNode3D = $scope.activeNode.getVisualNode();
            Visualizer.highlightNode( activeNode3D )
        }

        /**
         * branchNode invokes multiple connectNode calls for a given node.
         * @param String nodeID the node to connect from.
         * @param Number levelsDeep how many connections to limit.
         * @return void.
         */
        $scope.branchNode = function(nodeID, levelsDeep, originID) {
            if (levelsDeep <= 0) return;
            var i=0;
            var nodeData = $scope.getNodeDataByID(nodeID);
            if (nodeData === undefined) return;
            var limit = nodeData.connections.length;
            //todo: add in branched node list to check against to prevent loop backs.
            for(i=0;i<limit;++i) {
                var connection = nodeData.connections[i];
                if (nodeData) {
                    var connectionNode = $scope.getNodeDataByID(connection.getConnectionNode());
                    if (connectionNode !== undefined) $scope.createNode(connectionNode)
                    if (connection.getConnectionNode() !== originID) {
                        TweenMax.delayedCall(Math.random()*4+1,$scope.branchNode,[connection.getConnectionNode(),--levelsDeep,nodeID])
                    }
                }
            }
            Visualizer.clusterNode(nodeData);

            TweenMax.delayedCall(1,Visualizer.connectNode,[nodeData,true,true]);
        }

        $scope.getNodeDataByID = function(id) {
            return $scope.nodeDataManager.getNodeByID(id);
        }

        /**
         * setActiveNode creates a visual node at the specified xyz postion
         * for a given data node Id. It then navigates the camera to the node.
         * @param String id the node id.
         * @param Number x the x coordinate.
         * @param Number y the y coordinate.
         * @param Number z the z coordinate.
         * @return void.
         */
        $scope.setActiveNode = function(id,x,y,z) {
            if (id===undefined) id = $scope.inputNodeID;
            var nodeData = $scope.nodeDataManager.getNodeByID(id);
            if (nodeData === undefined) return;
            if (nodeData.getVisualNode() === undefined) $scope.createNode(nodeData,x,y,z);
            $scope.onNodeTargetted(null,id);
            Visualizer.moveCameraTargetToNode(id);
        }

        /**
         * locateNode creates a node (if not defined), and sets the visualizer
         * to target that node, which results in shifting perspective to it.
         *
         * @param id String the node id.
         * @param speed Number how fast to move to the node.
         * @param fly Boolean either fly-to or directly jump to the node.
         * @return void
         */
        $scope.locateNode = function(id,speed, fly) {
            if(id === undefined) id = $scope.inputNodeID;
            if(speed === undefined) speed = 3;
            console.log('========'+id);
            var nodeData = $scope.nodeDataManager.getNodeByID(id);
            if (nodeData.getVisualNode() === undefined) $scope.createNode(nodeData);
            Visualizer.targetNode(nodeData,0,fly,speed);
        }

        $scope.revealNetwork = function() {
            Visualizer.revealNetwork($scope.zoomLevel,20);
        }

        $scope.setFogLevel = function(value) {
            Visualizer.setFogLevel(value);
        }

        $scope.setZoom = function(value) {
            $scope.inputZoom = value;
        }

        $scope.getZoom = function() {
            return $scope.inputZoom;
        }

        $scope.simulateNodeConstruction = function(id) {
            if(id === undefined) id = $scope.inputNodeID;
            console.log(id);
            var node = $scope.nodeDataManager.getNodeByID(id);
            Visualizer.simulateNodeConstruction(node);
        }

        $scope.isolateNode = function(id) {
            var node = $scope.nodeDataManager.getNodeByID(id);
            Visualizer.isolateNode(node);
        }

        /**
         * displayConnection takes a NodeConnection object and calls the visualizer
         * to animate between the two nodes, highlighting their connection. If the
         * start of end node haven't been created (visually), they will be added
         * to the scene with this call.
         *
         * @return void.
         */
        $scope.displayConnection = function(connection) {
            var initNode = $scope.nodeDataManager.getNodeByID(connection.getInitialNode());
            var connectNode = $scope.nodeDataManager.getNodeByID(connection.getConnectionNode());
            if (!initNode.getVisualNode()) $scope.createNode(initNode);
            if (!connectNode.getVisualNode()) $scope.createNode(connectNode);
            Visualizer.displayConnection(connection,true);
        }

        $scope.displayNodeConnections = function(id) {
            if(id === undefined) id = $scope.inputNodeID;
            var node = $scope.nodeDataManager.getNodeByID(id);
            var connections = node.getConnections();
            var i=0;
            var limit = connections.length;
            for(i=0;i<limit;++i) {
                var nodeData = $scope.nodeDataManager.getNodeByID(connections[i].getConnectionNode());
                console.log(connections[i].getConnectionNode());
                if (nodeData.getVisualNode() === undefined) $scope.createNode(nodeData);
            }
            Visualizer.connectNode(node,true);
        }

        $scope.getGraphData = function() {
            $scope.nodeDataManager.loadData();
            $scope.nodes = $scope.nodeDataManager.getNodeList();
        }

        $scope.clearData = function() {
            var i=0;
            var limit = $scope.nodes.length;
            for (i=0;i<limit;++i)
            {
                Visualizer.removeNodeFromStage($scope.nodes[i]);
            }
            $scope.nodeDataManager.clearNodes();
            $scope.nodes = $scope.nodeDataManager.getNodeList();

        }

        $scope.clusterNodes = function() {
            //todo: check against previous connections for active clustering
            Visualizer.clusterNodes($scope.nodeDataManager.getNodeList());
        }

        $scope.connectAllNodes = function() {
            Visualizer.connectAllNodes($scope.nodeDataManager.getNodeList());
        }

        //  EVENT HANDLERS
        $scope.onAttributeSelected = function(evt,attribute) {
            $scope.activeAttribute = attribute;
            $scope.$apply()
        }

        $scope.onAttributeRollOver = function(evt,attribute) {
            $scope.activeAttribute = attribute;
            $scope.$apply()
        }

        $scope.onDataParsed = function() {
            //todo: possible add call back from visualizer that staggers each call until listener is triggered from previous node geometry is generated and placed.
            $scope.demoAnimation();
        }

        $scope.onNodeTargetted = function(evt,nodeID) {
            //console.log($scope.nodeDataManager.getNodeByID(nodeID))
            $scope.activeNode = $scope.nodeDataManager.getNodeByID(nodeID);
            var i=0;
            var limit = $scope.nodeDataManager.getNodeByID(nodeID).getConnections().length;
            var activeConnections = [];
            var mainNode = $scope.nodeDataManager.getNodeByID(nodeID);
            var connections = mainNode.getConnections();
            var attributes = mainNode.getAttributes();
            for (i=0;i<limit;++i)
            {
                var cNode = $scope.nodeDataManager.getNodeByID(connections[i].connectionNode);
                if (cNode !== undefined) activeConnections.push($scope.nodeDataManager.getNodeByID(nodeID).getConnections()[i])
            }
            $scope.activeNodeConnections = activeConnections;//$scope.nodeDataManager.getNodeByID(nodeID).getConnections().concat();
            //console.log($scope.activeNodeConnections);
        }

        $scope.init();
    });

})();

