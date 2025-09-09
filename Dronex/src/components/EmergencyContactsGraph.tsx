import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail } from "lucide-react";

interface EmergencyContact {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  relationship?: string;
  priority: number;
}

interface EmergencyContactsGraphProps {
  contacts: EmergencyContact[];
}

const ContactNode = ({ data }: { data: EmergencyContact }) => {
  const getPriorityColor = (priority: number) => {
    const colors = {
      1: '#ef4444', // red
      2: '#f97316', // orange
      3: '#eab308', // yellow
      4: '#3b82f6', // blue
      5: '#22c55e', // green
    };
    return colors[priority as keyof typeof colors] || '#6b7280';
  };

  const getPriorityLabel = (priority: number) => {
    const labels = {
      1: 'Primary',
      2: 'Secondary', 
      3: 'Tertiary',
      4: 'Backup',
      5: 'Emergency'
    };
    return labels[priority as keyof typeof labels] || `Priority ${priority}`;
  };

  return (
    <div 
      className="px-4 py-3 shadow-lg rounded-lg bg-white border-2 min-w-[180px]"
      style={{ borderColor: getPriorityColor(data.priority) }}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="text-center">
        <div className="font-semibold text-sm text-gray-900 mb-1">{data.name}</div>
        <Badge 
          className="text-xs mb-2"
          style={{ 
            backgroundColor: getPriorityColor(data.priority),
            color: 'white'
          }}
        >
          {getPriorityLabel(data.priority)}
        </Badge>
        
        <div className="space-y-1">
          <div className="flex items-center justify-center text-xs text-gray-600">
            <Phone className="w-3 h-3 mr-1" />
            {data.phone}
          </div>
          
          {data.email && (
            <div className="flex items-center justify-center text-xs text-gray-600">
              <Mail className="w-3 h-3 mr-1" />
              {data.email}
            </div>
          )}
          
          {data.relationship && (
            <div className="text-xs text-gray-500 mt-1">
              {data.relationship}
            </div>
          )}
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

const nodeTypes = {
  contact: ContactNode,
};

export const EmergencyContactsGraph = ({ contacts }: EmergencyContactsGraphProps) => {
  const { nodes, edges } = useMemo(() => {
    if (contacts.length === 0) {
      return { nodes: [], edges: [] };
    }

    // Create user center node
    const userNode: Node = {
      id: 'user',
      type: 'default',
      position: { x: 250, y: 150 },
      data: { label: 'You' },
      style: { 
        background: '#0ea5e9',
        color: 'white',
        border: '2px solid #0284c7',
        borderRadius: '50%',
        width: 80,
        height: 80,
        fontSize: '14px',
        fontWeight: 'bold'
      },
    };

    // Create contact nodes positioned in a circle around the user
    const contactNodes: Node[] = contacts.map((contact, index) => {
      const angle = (index * 2 * Math.PI) / contacts.length;
      const radius = 200;
      const x = 250 + radius * Math.cos(angle - Math.PI / 2);
      const y = 150 + radius * Math.sin(angle - Math.PI / 2);

      return {
        id: contact.id || `contact-${index}`,
        type: 'contact',
        position: { x: x - 90, y: y - 40 }, // Center the node
        data: contact as any,
      };
    });

    // Create edges from user to each contact
    const contactEdges: Edge[] = contacts.map((contact, index) => ({
      id: `e-user-${contact.id || index}`,
      source: 'user',
      target: contact.id || `contact-${index}`,
      type: 'smoothstep',
      style: { 
        strokeWidth: contact.priority === 1 ? 3 : 2,
        stroke: contact.priority === 1 ? '#ef4444' : '#64748b'
      },
      animated: contact.priority === 1,
    }));

    // Create edges between contacts based on priority hierarchy
    const priorityEdges: Edge[] = [];
    const sortedContacts = [...contacts].sort((a, b) => a.priority - b.priority);
    
    for (let i = 0; i < sortedContacts.length - 1; i++) {
      const currentContact = sortedContacts[i];
      const nextContact = sortedContacts[i + 1];
      
      priorityEdges.push({
        id: `e-priority-${currentContact.id}-${nextContact.id}`,
        source: currentContact.id || `contact-${contacts.indexOf(currentContact)}`,
        target: nextContact.id || `contact-${contacts.indexOf(nextContact)}`,
        type: 'smoothstep',
        style: { 
          strokeWidth: 1,
          stroke: '#94a3b8',
          strokeDasharray: '5,5'
        },
      });
    }

    return {
      nodes: [userNode, ...contactNodes],
      edges: [...contactEdges, ...priorityEdges],
    };
  }, [contacts]);

  if (contacts.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium mb-1">No contacts to display</div>
          <div className="text-sm">Add emergency contacts to see the network graph</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[500px] w-full border rounded-lg overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        style={{ background: '#f8fafc' }}
      >
        <Background color="#e2e8f0" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
};