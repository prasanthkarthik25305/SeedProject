import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";

interface Guideline {
  title: string;
  description: string;
  color: string;
  icon: string;
  content: {
    before: string[];
    during: string[];
    after: string[];
  };
}

const guidelines: Guideline[] = [
  {
    title: "Earthquake Safety",
    description: "Drop, Cover, and Hold On protocols",
    color: "border-orange-200 bg-orange-50",
    icon: "🏠",
    content: {
      before: [
        "Secure heavy furniture and appliances to walls",
        "Identify safe spots in each room (under sturdy tables, against interior walls)",
        "Keep emergency supplies and flashlights accessible",
        "Practice earthquake drills with family members",
        "Store breakable items on lower shelves"
      ],
      during: [
        "DROP to your hands and knees immediately",
        "COVER your head and neck under a sturdy table or desk",
        "HOLD ON until the shaking stops",
        "Stay indoors - do not run outside",
        "If outdoors, move away from buildings, trees, and power lines",
        "If in a vehicle, pull over safely and stay inside"
      ],
      after: [
        "Check yourself and others for injuries",
        "Expect aftershocks and be ready to Drop, Cover, and Hold On",
        "Inspect your home for damage and evacuate if unsafe",
        "Turn off gas if you smell it or hear hissing",
        "Use text messages instead of phone calls to communicate",
        "Stay away from damaged buildings and infrastructure"
      ]
    }
  },
  {
    title: "Hurricane Preparedness",
    description: "Evacuation and shelter guidelines",
    color: "border-blue-200 bg-blue-50",
    icon: "🌪️",
    content: {
      before: [
        "Monitor weather forecasts and hurricane warnings",
        "Prepare evacuation routes and designated meeting points",
        "Stock up on non-perishable food, water (1 gallon per person per day)",
        "Board up windows and secure outdoor objects",
        "Fill bathtubs and containers with water",
        "Charge all electronic devices and power banks"
      ],
      during: [
        "Stay indoors away from windows and glass doors",
        "Move to an interior room on the lowest floor",
        "If ordered to evacuate, leave immediately",
        "Do not go outside during the 'eye' of the hurricane",
        "Listen to emergency broadcasts for updates",
        "Avoid using candles - use flashlights instead"
      ],
      after: [
        "Wait for official all-clear before going outside",
        "Avoid standing water - it may be electrically charged or contaminated",
        "Document property damage with photos for insurance",
        "Watch for fallen power lines and damaged structures",
        "Boil water until authorities confirm it's safe",
        "Contact family and friends to let them know you're safe"
      ]
    }
  },
  {
    title: "Fire Emergency",
    description: "Evacuation routes and safety measures",
    color: "border-red-200 bg-red-50",
    icon: "🔥",
    content: {
      before: [
        "Install smoke alarms on every level of your home",
        "Test smoke alarms monthly and change batteries yearly",
        "Create and practice a fire escape plan with two exits from each room",
        "Keep fire extinguishers accessible and learn how to use them",
        "Clear clutter from exits and hallways",
        "Store flammable materials safely away from heat sources"
      ],
      during: [
        "Alert others immediately by shouting 'FIRE!'",
        "If there's smoke, crawl low under the smoke to exit",
        "Feel doors before opening - if hot, use another exit",
        "Close doors behind you to slow fire spread",
        "Never use elevators - use stairs only",
        "Once out, stay out - never go back inside",
        "Call emergency services from outside"
      ],
      after: [
        "Go to your designated meeting point",
        "Account for all family members and pets",
        "Inform firefighters if anyone is missing",
        "Do not re-enter until fire officials say it's safe",
        "Contact your insurance company",
        "Find temporary shelter if your home is uninhabitable",
        "Seek medical attention for burns or smoke inhalation"
      ]
    }
  },
  {
    title: "Flood Response",
    description: "Water safety and evacuation procedures",
    color: "border-cyan-200 bg-cyan-50",
    icon: "🌊",
    content: {
      before: [
        "Know your flood risk and evacuation routes",
        "Move important documents and valuables to upper floors",
        "Install check valves in plumbing to prevent backflow",
        "Keep sandbags and flood barriers ready if in flood-prone areas",
        "Have a battery-powered radio for emergency alerts",
        "Review your insurance coverage for flood protection"
      ],
      during: [
        "Evacuate immediately if told to do so",
        "Never walk, swim, or drive through flood waters",
        "Turn off utilities if instructed and time permits",
        "Move to higher ground if trapped",
        "Signal for help if stranded (flashlight, bright cloth)",
        "Avoid contact with flood water - it may be contaminated",
        "Stay informed through emergency broadcasts"
      ],
      after: [
        "Return home only when authorities say it's safe",
        "Avoid standing water and flood-damaged areas",
        "Document damage with photos before cleanup",
        "Throw away contaminated food and items that can't be disinfected",
        "Dry out your home to prevent mold growth",
        "Be alert for displaced wildlife and insects",
        "Watch for structural damage before entering buildings"
      ]
    }
  },
  {
    title: "Medical Emergency",
    description: "First aid and emergency response",
    color: "border-green-200 bg-green-50",
    icon: "🏥",
    content: {
      before: [
        "Take first aid and CPR certification courses",
        "Keep a well-stocked first aid kit at home and in vehicles",
        "Know the location of nearest hospitals and urgent care centers",
        "Keep list of emergency contacts and medical information",
        "Learn basic first aid techniques (bandaging, pressure points)",
        "Store necessary medications and medical supplies"
      ],
      during: [
        "Call emergency services (911) immediately for serious injuries",
        "Stay calm and assess the situation for safety",
        "Provide basic first aid if trained (stop bleeding, CPR if needed)",
        "Do not move seriously injured persons unless in immediate danger",
        "Keep the person comfortable and monitor vital signs",
        "Provide information to emergency responders when they arrive",
        "Stay with the injured person until help arrives"
      ],
      after: [
        "Follow up with medical professionals as directed",
        "Monitor for signs of infection or complications",
        "Keep records of treatments and medical visits",
        "Replace used items in your first aid kit",
        "Review what happened and how response could improve",
        "Support the person's recovery process",
        "Seek counseling if traumatic experience affects you"
      ]
    }
  },
  {
    title: "General Preparedness",
    description: "Emergency kit and communication plans",
    color: "border-purple-200 bg-purple-50",
    icon: "📋",
    content: {
      before: [
        "Assemble emergency kit: water (1 gal/person/day for 3 days), non-perishable food",
        "Include flashlights, batteries, first aid kit, medications, radio",
        "Keep copies of important documents in waterproof container",
        "Create family communication plan with out-of-area contact",
        "Learn emergency skills: first aid, CPR, fire extinguisher use",
        "Keep cash on hand (ATMs may not work during emergencies)",
        "Plan for pets: food, water, carrier, medical records"
      ],
      during: [
        "Stay informed through official emergency broadcasts",
        "Follow evacuation orders immediately if issued",
        "Use your emergency communication plan to contact family",
        "Stay calm and help others if possible",
        "Conserve phone battery - use text messages",
        "Follow instructions from emergency officials",
        "Stay where you are if it's safe - avoid unnecessary travel"
      ],
      after: [
        "Check on family, neighbors, and vulnerable community members",
        "Assess damage and document for insurance claims",
        "Replenish emergency supplies used",
        "Review and update your emergency plan based on lessons learned",
        "Share your experience to help others prepare",
        "Participate in community recovery efforts",
        "Take care of mental health - seek support if needed"
      ]
    }
  }
];

export default function EmergencyGuidelines() {
  const [selectedGuideline, setSelectedGuideline] = useState<Guideline | null>(null);

  if (selectedGuideline) {
    return (
      <div className="space-y-6">
        <Button
          variant="outline"
          onClick={() => setSelectedGuideline(null)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to All Guidelines
        </Button>

        <Card className={selectedGuideline.color}>
          <CardHeader className="text-center">
            <div className="text-6xl mb-4">{selectedGuideline.icon}</div>
            <CardTitle className="text-2xl">{selectedGuideline.title}</CardTitle>
            <CardDescription className="text-base">
              {selectedGuideline.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="before">
                <AccordionTrigger className="text-lg font-semibold">
                  <div className="flex items-center">
                    <AlertCircle className="mr-2 h-5 w-5 text-yellow-600" />
                    Before the Emergency
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-3 mt-4">
                    {selectedGuideline.content.before.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle2 className="mr-3 h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="during">
                <AccordionTrigger className="text-lg font-semibold">
                  <div className="flex items-center">
                    <AlertCircle className="mr-2 h-5 w-5 text-red-600" />
                    During the Emergency
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-3 mt-4">
                    {selectedGuideline.content.during.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle2 className="mr-3 h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="after">
                <AccordionTrigger className="text-lg font-semibold">
                  <div className="flex items-center">
                    <AlertCircle className="mr-2 h-5 w-5 text-blue-600" />
                    After the Emergency
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-3 mt-4">
                    {selectedGuideline.content.after.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle2 className="mr-3 h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {guidelines.map((guideline, index) => (
        <Card
          key={index}
          className={`${guideline.color} hover:shadow-lg transition-shadow cursor-pointer`}
          onClick={() => setSelectedGuideline(guideline)}
        >
          <CardHeader className="text-center">
            <div className="text-4xl mb-2">{guideline.icon}</div>
            <CardTitle className="text-lg">{guideline.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">
              {guideline.description}
            </CardDescription>
            <Button variant="outline" className="w-full mt-4">
              View Guidelines
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
