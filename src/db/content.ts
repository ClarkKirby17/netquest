/* Sample curriculum for seeding: one module, three paginated lessons,
   a ten-question quiz, arcade questions, and a CLI mission.
   Real networking content so the app demos with something defensible.

   Page breaks in lesson HTML are a paragraph containing [[page]] —
   the same marker the editor's page-break button inserts. */

export const MODULE_1 = {
  title: "Networking Today",
  description:
    "How networks connect the modern world — the devices that carry your data, the media it travels over, and the diagrams engineers use to describe it all.",
};

export const LESSONS: { title: string; contentHtml: string }[] = [
  {
    title: "Networks Affect Our Lives",
    contentHtml: `
<h2>We are more connected than ever</h2>
<p>Among all of the essentials for human existence, the need to interact with others ranks just below our need to sustain life. Networks connect people and promote unrestricted communication. Everything from a text message to a video call travels across infrastructure that someone designed, built, and maintains.</p>
<p>Today's networks carry conversations that would once have required a physical journey. A student in Caloocan can attend a lecture streamed from Singapore, submit work to a server in Frankfurt, and get feedback the same afternoon. None of that is magic — it is routing, addressing, and protocols doing their job.</p>
<h2>Networks support the way we learn</h2>
<p>Communication technology has changed the classroom. Course material lives online, collaboration happens in shared documents, and assessment can be instant. What used to be a room is now a room <strong>plus a network</strong>, and when the network fails, the room stops working.</p>
<p>[[page]]</p>
<h2>Networks support the way we work</h2>
<p>Businesses depend on networks for far more than email. Inventory systems, payment processing, video conferencing, and remote access all ride on the same infrastructure. A retailer whose network goes down does not just lose email — it stops being able to sell.</p>
<p>This is why network reliability is measured so carefully. An availability figure of 99.9% sounds impressive until you calculate it: that is nearly <strong>nine hours of downtime a year</strong>. For a hospital or a bank, that number is unacceptable.</p>
<h2>Networks support the way we play</h2>
<p>Online gaming, streaming video, and social platforms are among the heaviest consumers of bandwidth in the world. They also drive innovation — the demand for lower latency and higher throughput pushes network technology forward faster than business applications alone ever would.</p>
<p>[[page]]</p>
<h2>What this course covers</h2>
<p>Over the coming modules you will move from these broad ideas into the specifics:</p>
<ul>
  <li>The <strong>devices</strong> that make up a network and what each one actually does</li>
  <li>The <strong>media</strong> that carries signals, and why cable choice matters</li>
  <li><strong>Addressing</strong>, so data can find its destination</li>
  <li><strong>Protocols</strong>, the agreed rules that let different systems understand each other</li>
  <li><strong>Configuration</strong>, using the same command line that runs real equipment</li>
</ul>
<p>By the end you should be able to look at a network diagram and explain what every symbol on it is doing.</p>
`.trim(),
  },
  {
    title: "Network Components",
    contentHtml: `
<h2>Three categories</h2>
<p>Every network, from a home setup to a campus backbone, is built from three kinds of things: <strong>devices</strong>, <strong>media</strong>, and <strong>services</strong>. Learn to sort what you are looking at into these three buckets and any diagram becomes readable.</p>
<h2>End devices</h2>
<p>An end device is where a message originates or where it finally arrives. Laptops, phones, printers, servers, and IP cameras are all end devices. In network diagrams they sit at the edges — the leaves of the tree.</p>
<p>Every end device needs an address so other devices can reach it. Without one it can be physically connected and still be unreachable, which is one of the most common faults you will troubleshoot.</p>
<h2>Intermediary devices</h2>
<p>Intermediary devices connect end devices to one another and connect networks to other networks. They do not usually create the data — they move it.</p>
<table>
  <thead>
    <tr><th>Device</th><th>What it does</th></tr>
  </thead>
  <tbody>
    <tr><td>Switch</td><td>Forwards frames within a local network using MAC addresses</td></tr>
    <tr><td>Router</td><td>Forwards packets between different networks using IP addresses</td></tr>
    <tr><td>Wireless access point</td><td>Connects wireless clients to the wired network</td></tr>
    <tr><td>Firewall</td><td>Filters traffic according to security rules</td></tr>
  </tbody>
</table>
<p>The distinction between a switch and a router is the one worth memorising early: <strong>switches work inside a network, routers work between networks.</strong></p>
<p>[[page]]</p>
<h2>Network media</h2>
<p>Media is the physical path the signal travels. Three types dominate:</p>
<ul>
  <li><strong>Copper cable</strong> — electrical pulses. Cheap, easy to terminate, limited to about 100 metres per run.</li>
  <li><strong>Fibre optic cable</strong> — pulses of light. Far greater distance and bandwidth, immune to electrical interference, more expensive and more fragile.</li>
  <li><strong>Wireless</strong> — radio waves. No cabling at all, but shared, and subject to interference and distance limits.</li>
</ul>
<p>Choosing media is a trade-off between distance, bandwidth, cost, and the environment it will be installed in. A run between two buildings 400 metres apart rules out copper before you consider anything else.</p>
<h2>Services</h2>
<p>Services are the software that makes the network useful — email hosting, web servers, file sharing, DNS. Users notice services; they rarely notice the devices and media underneath, until something breaks.</p>
`.trim(),
  },
  {
    title: "Network Representations and Topologies",
    contentHtml: `
<h2>Speaking in diagrams</h2>
<p>Network engineers communicate in diagrams. A topology diagram shows how devices connect, using standard symbols so anyone in the field can read it without explanation.</p>
<p>Some vocabulary you will see attached to those diagrams:</p>
<ul>
  <li><strong>Network interface card (NIC)</strong> — the adapter that physically connects a device to the network</li>
  <li><strong>Port</strong> — the connector on a device where media plugs in</li>
  <li><strong>Interface</strong> — a specialised port on a networking device, such as <code>GigabitEthernet0/1</code> on a router</li>
</ul>
<h2>Physical versus logical</h2>
<p>A <strong>physical topology</strong> diagram shows where the equipment actually is — which rack, which room, which cable runs where. An electrician or a technician pulling cable needs this.</p>
<p>A <strong>logical topology</strong> diagram shows addressing and how data flows — IP addresses, subnets, and routing paths. A network engineer troubleshooting a connectivity problem needs this.</p>
<p>They describe the same network and they rarely look alike.</p>
<p>[[page]]</p>
<h2>Common topologies</h2>
<p><strong>Star</strong> — every device connects to one central point, usually a switch. The dominant design in modern LANs. Easy to troubleshoot, but the centre is a single point of failure.</p>
<p><strong>Mesh</strong> — devices connect to multiple others, so several paths exist between any two points. Expensive, and the standard for network cores where an outage is unacceptable.</p>
<p><strong>Bus and ring</strong> — mostly historical, worth recognising in older documentation and exam questions.</p>
<h2>LAN, WAN, and the internet</h2>
<p>A <strong>LAN</strong> covers a small area under one administrative control — a school campus, an office floor. A <strong>WAN</strong> connects LANs across geographic distance, typically over infrastructure owned by a service provider.</p>
<blockquote>The internet is not a single network. It is a worldwide collection of interconnected networks that agree to use common protocols, which is precisely why no single organisation owns or governs it.</blockquote>
`.trim(),
  },
];

type Q = {
  type?: "multiple_choice" | "true_false";
  question: string;
  optionA: string;
  optionB: string;
  optionC?: string;
  optionD?: string;
  correctOption: string;
  explanation: string;
};

export const QUIZ_QUESTIONS: Q[] = [
  {
    question: "Which device forwards packets between different networks?",
    optionA: "Switch", optionB: "Router", optionC: "Hub", optionD: "Repeater",
    correctOption: "B",
    explanation:
      "Routers operate at Layer 3 and use IP addresses to forward packets between separate networks. Switches move frames within a single network.",
  },
  {
    question: "Which of these is an end device?",
    optionA: "Wireless access point", optionB: "Router", optionC: "Network printer", optionD: "Firewall",
    correctOption: "C",
    explanation:
      "End devices originate or receive messages. Access points, routers, and firewalls are intermediary devices — they move and control traffic rather than producing it.",
  },
  {
    type: "true_false",
    question: "A switch uses IP addresses to make its forwarding decisions.",
    optionA: "True", optionB: "False",
    correctOption: "B",
    explanation:
      "Switches forward frames using MAC addresses, which is a Layer 2 function. Routers are the devices that make decisions based on IP addresses.",
  },
  {
    question: "Two buildings 400 metres apart need to be connected. Which medium is appropriate?",
    optionA: "Cat6 copper", optionB: "Fibre optic", optionC: "Coaxial", optionD: "Cat5e copper",
    correctOption: "B",
    explanation:
      "Copper Ethernet is limited to roughly 100 metres per run. At 400 metres, fibre is the only practical choice.",
  },
  {
    question: "What does LAN stand for?",
    optionA: "Local Area Network", optionB: "Large Access Node",
    optionC: "Linked Address Network", optionD: "Logical Access Network",
    correctOption: "A",
    explanation:
      "A LAN connects devices within a limited geographic area under a single administrative control, such as a school or an office.",
  },
  {
    question: "Which topology connects every device to a single central point?",
    optionA: "Mesh", optionB: "Ring", optionC: "Star", optionD: "Bus",
    correctOption: "C",
    explanation:
      "Star topology is the standard for modern LANs. It is simple to troubleshoot, though the central device is a single point of failure.",
  },
  {
    type: "true_false",
    question:
      "A physical topology diagram and a logical topology diagram of the same network usually look identical.",
    optionA: "True", optionB: "False",
    correctOption: "B",
    explanation:
      "A physical diagram shows equipment placement and cable runs. A logical diagram shows addressing and data flow. They describe the same network from very different angles.",
  },
  {
    question: "Which address is a valid IPv4 address?",
    optionA: "192.168.1.300", optionB: "256.1.1.1", optionC: "192.168.1.10", optionD: "10.0.0.256",
    correctOption: "C",
    explanation:
      "Each of the four IPv4 octets must be between 0 and 255, which rules out every option containing 256 or 300.",
  },
  {
    question: "What is the interface identifier GigabitEthernet0/1 an example of?",
    optionA: "An IP address", optionB: "A specialised port on a networking device",
    optionC: "A MAC address", optionD: "A subnet mask",
    correctOption: "B",
    explanation:
      "An interface is a port on a networking device. The name identifies its speed and physical position so it can be referenced in configuration.",
  },
  {
    type: "true_false",
    question: "The internet is a single network owned by an international governing body.",
    optionA: "True", optionB: "False",
    correctOption: "B",
    explanation:
      "The internet is a worldwide collection of interconnected networks that agree on common protocols. No single organisation owns or controls it.",
  },
];

export const ARCADE_QUESTIONS: {
  question: string;
  optionA: string; optionB: string; optionC: string;
  correctOption: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}[] = [
  {
    question: "Which device connects wireless clients to a wired network?",
    optionA: "Router", optionB: "Wireless access point", optionC: "Firewall",
    correctOption: "B",
    explanation: "An access point bridges wireless clients onto the wired network.",
    difficulty: "easy",
  },
  {
    question: "What is the maximum practical length of a copper Ethernet run?",
    optionA: "100 metres", optionB: "500 metres", optionC: "1 kilometre",
    correctOption: "A",
    explanation: "Beyond roughly 100 metres the signal degrades too far — that is where fibre takes over.",
    difficulty: "easy",
  },
  {
    question: "Which of these is NOT an intermediary device?",
    optionA: "Switch", optionB: "Network printer", optionC: "Router",
    correctOption: "B",
    explanation: "A printer is an end device — it receives data rather than forwarding it onward.",
    difficulty: "easy",
  },
  {
    question: "Which layer of the OSI model does a router primarily operate at?",
    optionA: "Layer 2", optionB: "Layer 3", optionC: "Layer 4",
    correctOption: "B",
    explanation: "Routers make forwarding decisions using IP addresses, which is Layer 3.",
    difficulty: "medium",
  },
  {
    question: "How many usable host addresses does a /26 subnet provide?",
    optionA: "64", optionB: "62", optionC: "30",
    correctOption: "B",
    explanation: "A /26 contains 64 addresses; subtracting the network and broadcast addresses leaves 62 usable.",
    difficulty: "medium",
  },
  {
    question: "Which protocol resolves an IP address to a MAC address on a LAN?",
    optionA: "ARP", optionB: "DNS", optionC: "DHCP",
    correctOption: "A",
    explanation: "ARP maps a known IPv4 address to the MAC address needed to deliver the frame locally.",
    difficulty: "medium",
  },
  {
    question: "A host at 192.168.10.50/26 sends to 192.168.10.70. What happens?",
    optionA: "Delivered directly on the local network",
    optionB: "Sent to the default gateway",
    optionC: "Dropped as unreachable",
    correctOption: "B",
    explanation:
      "/26 blocks run .0-.63 and .64-.127, so the two addresses sit in different subnets and the traffic must go via the gateway.",
    difficulty: "hard",
  },
  {
    question: "What is the network address of the host 172.16.45.200/20?",
    optionA: "172.16.32.0", optionB: "172.16.40.0", optionC: "172.16.45.0",
    correctOption: "A",
    explanation:
      "A /20 increments by 16 in the third octet, so the block 32-47 contains 45 and the network address is 172.16.32.0.",
    difficulty: "hard",
  },
];
