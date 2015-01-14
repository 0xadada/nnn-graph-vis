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

    $scope.init = function() {
        $scope.createNodeDataManager();
        $scope.createColorManager();
        $scope.createVisualizer();
    }

    $scope.demoMode = function() {
        
        // fade out the start button
        TweenMax.to('.start_button',.5,{autoAlpha:0})

        // generate the graph and use a callback to trigger the animation
        $scope.getGraphData();
    }

    $scope.demoAnimation = function() {

        // here is where you can set different movie sequences to run
        // when you click the "Connect" button
        var scene_to_run = 1;
        
        if(scene_to_run == 1) {
            $scope.scene1();
        } else if(scene_to_run == 2) {
            $scope.scene2();
        }
                
    }

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
    
    }
    
    $scope.drawNode = function(t, node_id, x, y, z) {
        var nodeData = $scope.getNodeDataByID(node_id);
        TweenMax.delayedCall(t,$scope.createNode,[nodeData,x,y,z]);
        TweenMax.delayedCall(t,Visualizer.activateNode,[nodeData,true]);        
    }
    
    $scope.moveToNode = function(t, node_id, move_time, use_curved_path) {
        TweenMax.delayedCall(t,$scope.locateNode,[node_id,move_time,use_curved_path]);
    }
    
    $scope.showConnection = function(t, node_id, connection_number) {
        var node = $scope.nodeDataManager.nodesHash[node_id];
        var connection = node.connections[connection_number];
        TweenMax.delayedCall(t,Visualizer.displayConnection,[connection,true]);
    }    
    
    $scope.demoLocateNodeConnection = function() {
        var connection = $scope.activeNode.getConnections()[0];
        console.log(connection);
        $scope.displayConnection(connection);
        TweenMax.delayedCall(2,$scope.locateNode,[connection.getConnectionNode(),5,false]);
        TweenMax.delayedCall(6,Visualizer.spinCamera,[5]);
        $scope.$apply();
    }

    $scope.createColorManager = function()
    {
        $scope.colorManager = new ColorManager($scope);
    }

    $scope.createNodeDataManager = function()
    {
        $scope.nodeDataManager = new NodeDataManager($scope);
        $scope.$on(NodeDataManager.DATA_PARSED, $scope.onDataParsed);
    }

    $scope.createVisualizer = function() {
        //$scope.visualizer = new Visualizer()
        $scope.$on(Visualizer.INITIALIZE,$scope.onVisInit);
        $scope.$on(Visualizer.NODE_TARGETTED,$scope.onNodeTargetted);
        $scope.$on(Visualizer.ATTRIBUTE_SELECTED,$scope.onAttributeSelected);
        $scope.$on(Visualizer.ATTRIBUTE_ROLL_OVER,$scope.onAttributeRollOver);
        Visualizer.init($scope,$scope.nodeDataManager,$scope.colorManager);
    }

    $scope.createNode = function(nodeData,x,y,z) {
        // create new node object

        // check if it is in the node data pool already

        // check if it is already created in the visualizer

        if(nodeData.getVisualNode() === undefined)
        {
            // create new visualizer node
            Visualizer.createNode(nodeData,x,y,z);
        }
        //Visualizer.targetNode(nodeData,1,false,2);
        //TweenMax.delayedCall(2,Visualizer.activateNode,[nodeData])
        // locate and activate
    }

    $scope.highlightConnection = function(connection)
    {
        //console.log(connection.getVisualConnection());
        if (connection.getVisualConnection() !== undefined)
        {
            Visualizer.highlightConnection(connection);
        }
    }

    $scope.branchNode = function(nodeID,levelsDeep,originID)
    {
        if (levelsDeep <= 0) return;
        var i=0;
        var nodeData = $scope.getNodeDataByID(nodeID);
        if (nodeData === undefined) return;
        //$scope.createNode(nodeData);
        var limit = nodeData.connections.length;
        //todo: add in branched node list to check against to prevent loop backs.
        for(i=0;i<limit;++i)
        {
            var connection = nodeData.connections[i];
            if (nodeData)
            {
                //console.log(connection.getConnectionNode());
                //$scope.branchNode(connection.getConnectionNode(),--levelsDeep,nodeID);
                var connectionNode = $scope.getNodeDataByID(connection.getConnectionNode());
                if (connectionNode !== undefined) $scope.createNode(connectionNode)
                if (connection.getConnectionNode() !== originID)
                {
                    TweenMax.delayedCall(Math.random()*4+1,$scope.branchNode,[connection.getConnectionNode(),--levelsDeep,nodeID])
                }

                //$scope.displayConnection(connection)
            }
        }
        Visualizer.clusterNode(nodeData);
        //Visualizer.connectNode(nodeData,true,true);

        TweenMax.delayedCall(1,Visualizer.connectNode,[nodeData,true,true]);
    }


    $scope.getNodeDataByID = function(id) {
        return $scope.nodeDataManager.getNodeByID(id);
    }

    $scope.setActiveNode = function(id,x,y,z) {
        if (id===undefined) id = $scope.inputNodeID;
        //console.log($scope.activeNode);
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

    $scope.getZoom = function()
    {
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

    $scope.displayConnection = function(connection)
    {
        var initNode = $scope.nodeDataManager.getNodeByID(connection.getInitialNode());
        var connectNode = $scope.nodeDataManager.getNodeByID(connection.getConnectionNode());
        if (!initNode.getVisualNode()) $scope.createNode(initNode);
        if (!connectNode.getVisualNode()) $scope.createNode(connectNode);
        Visualizer.displayConnection(connection,true);
    }


    $scope.displayNodeConnections = function(id)
    {
        if(id === undefined) id = $scope.inputNodeID;
        var node = $scope.nodeDataManager.getNodeByID(id);
        var connections = node.getConnections();
        var i=0;
        var limit = connections.length;
        for(i=0;i<limit;++i)
        {
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


    $scope.sparkNode = function() { }

   //  EVENT HANDLERS

    $scope.onAttributeSelected = function(evt,attribute)
    {
        $scope.activeAttribute = attribute;
        $scope.$apply()
    }

    $scope.onAttributeRollOver = function(evt,attribute)
    {
        $scope.activeAttribute = attribute;
        $scope.$apply()
    }

    $scope.onDataParsed = function()
    {
        //todo: possible add call back from visualizer that staggers each call until listener is triggered from previous node geometry is generated and placed.
        $scope.demoAnimation();
        //$scope.createNode($scope.nodes[0])
        //Visualizer.createNodes($scope.nodes);
        //$scope.killDataParseListener();
    }

    $scope.onNodeTargetted = function(evt,nodeID)
    {
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

    $scope.onVisInit = function()
    {
        console.log(Visualizer.INITIALIZE)
    }

    $scope.init();
    })
})();