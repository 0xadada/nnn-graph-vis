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
         * over time using the TweenMax animation library.
         *
         * @return void.
         */
        $scope.demoAnimation = function() {
            // begin playback
            $scope.isPaused = false;
            $scope.animationBegan = true;

            // begin animation
            TweenMax.delayedCall(1,$scope.locateNode,[1553718,8,true]);

            TweenMax.delayedCall(5,Visualizer.setFogLevel,[0.001,3]);
            TweenMax.delayedCall(8,Visualizer.spinCamera,[10]);

            TweenMax.delayedCall(10,$scope.demoLocateNodeConnection);
            //ToDo: Uncomment TweenMax.delayedCall(20,$scope.demoLocateNodeConnection);

            // ToDo: not origin jump back to Sip wine
            TweenMax.delayedCall(15,$scope.locateNode,[1553718,8,true]);
            // ToDo: Hightlight here  get node connections and highlight them
            TweenMax.delayedCall(23,$scope.highlightConnection,[1017]);
return;

            TweenMax.delayedCall(30,$scope.locateNode,[1553718,4,false]);
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
                window.highlightConnection = $scope.highlightConnection;
            }
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
            console.log('data parsed');
            console.log($scope.nodes[0])
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

