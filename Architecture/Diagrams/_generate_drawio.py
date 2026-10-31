#!/usr/bin/env python3
"""Generate draw.io (mxfile) diagrams from the v1.2 revised architecture plan."""

from __future__ import annotations

import uuid
from pathlib import Path
from xml.sax.saxutils import escape

OUT = Path(__file__).resolve().parent

TITLE = (
    "rounded=0;whiteSpace=wrap;html=1;fillColor=#1A365D;strokeColor=#1A365D;"
    "fontColor=#FFFFFF;fontStyle=1;fontSize=16;align=center;verticalAlign=middle;"
)
SUBTITLE = (
    "rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor=none;"
    "fontColor=#4A5568;fontSize=11;align=left;verticalAlign=middle;"
)
NOTE = (
    "shape=note;whiteSpace=wrap;html=1;size=14;fillColor=#FFF2CC;strokeColor=#D6B656;"
    "fontSize=11;align=left;spacing=8;"
)
CLIENT = (
    "rounded=1;whiteSpace=wrap;html=1;fillColor=#DAE8FC;strokeColor=#6C8EBF;"
    "fontSize=12;fontStyle=1;arcSize=8;"
)
API = (
    "rounded=1;whiteSpace=wrap;html=1;fillColor=#FFE6CC;strokeColor=#D79B00;"
    "fontSize=12;fontStyle=1;arcSize=8;"
)
DATA = (
    "shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;"
    "size=10;fillColor=#D5E8D4;strokeColor=#82B366;fontSize=12;fontStyle=1;"
)
WORKER = (
    "rounded=1;whiteSpace=wrap;html=1;fillColor=#E1D5E7;strokeColor=#9673A6;"
    "fontSize=12;fontStyle=1;arcSize=8;"
)
MODULE = (
    "rounded=1;whiteSpace=wrap;html=1;fillColor=#FFF2CC;strokeColor=#D6B656;"
    "fontSize=11;arcSize=10;"
)
SA = (
    "rounded=1;whiteSpace=wrap;html=1;fillColor=#F8CECC;strokeColor=#B85450;"
    "fontSize=12;fontStyle=1;arcSize=10;"
)
PH = (
    "rounded=1;whiteSpace=wrap;html=1;fillColor=#FFF2CC;strokeColor=#D6B656;"
    "fontSize=12;fontStyle=1;arcSize=10;"
)
MEMBER = (
    "rounded=1;whiteSpace=wrap;html=1;fillColor=#D5E8D4;strokeColor=#82B366;"
    "fontSize=12;fontStyle=1;arcSize=10;"
)
CUSTOMER = (
    "rounded=1;whiteSpace=wrap;html=1;fillColor=#DAE8FC;strokeColor=#6C8EBF;"
    "fontSize=12;fontStyle=1;arcSize=10;"
)
TICKET = (
    "rounded=1;whiteSpace=wrap;html=1;fillColor=#F5F5F5;strokeColor=#666666;"
    "fontSize=12;fontStyle=1;arcSize=8;"
)
PROCESS = (
    "rounded=1;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#4A5568;"
    "fontSize=11;arcSize=8;"
)
SWIM = (
    "swimlane;startSize=36;fillColor=#EDF2F7;strokeColor=#A0AEC0;fontStyle=1;"
    "fontSize=13;fontColor=#1A365D;whiteSpace=wrap;html=1;"
)
ENTITY = (
    "swimlane;fontStyle=1;childLayout=stackLayout;horizontal=1;startSize=30;"
    "fillColor=#1A365D;fontColor=#FFFFFF;horizontalStack=0;resizeParent=1;"
    "resizeParentMax=0;collapsible=0;marginBottom=0;strokeColor=#1A365D;"
    "whiteSpace=wrap;html=1;fontSize=12;"
)
ATTR = (
    "text;strokeColor=none;fillColor=#FFFFFF;align=left;verticalAlign=middle;"
    "spacingLeft=8;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];"
    "portConstraint=eastwest;whiteSpace=wrap;html=1;fontSize=10;fontColor=#2D3748;"
)
PK = ATTR + "fontStyle=1;"
STATUS = {
    "open": "rounded=1;whiteSpace=wrap;html=1;fillColor=#DAE8FC;strokeColor=#6C8EBF;fontStyle=1;fontSize=12;arcSize=20;",
    "in_progress": "rounded=1;whiteSpace=wrap;html=1;fillColor=#FFF2CC;strokeColor=#D6B656;fontStyle=1;fontSize=12;arcSize=20;",
    "on_hold": "rounded=1;whiteSpace=wrap;html=1;fillColor=#FFE6CC;strokeColor=#D79B00;fontStyle=1;fontSize=12;arcSize=20;",
    "resolved": "rounded=1;whiteSpace=wrap;html=1;fillColor=#D5E8D4;strokeColor=#82B366;fontStyle=1;fontSize=12;arcSize=20;",
    "closed": "rounded=1;whiteSpace=wrap;html=1;fillColor=#F5F5F5;strokeColor=#666666;fontStyle=1;fontSize=12;arcSize=20;",
}
EDGE = (
    "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;"
    "endArrow=block;endFill=1;strokeColor=#4A5568;fontSize=10;fontColor=#2D3748;"
    "labelBackgroundColor=#FFFFFF;"
)
DASH = EDGE + "dashed=1;dashPattern=8 8;"
GROUP = (
    "rounded=1;whiteSpace=wrap;html=1;fillColor=#F7FAFC;strokeColor=#A0AEC0;"
    "verticalAlign=top;fontStyle=1;fontSize=12;fontColor=#1A365D;arcSize=6;spacingTop=6;"
)


class Diagram:
    def __init__(self, name: str, width: int = 1600, height: int = 1100) -> None:
        self.name = name
        self.width = width
        self.height = height
        self.cells: list[str] = []
        self._n = 2

    def id(self) -> str:
        i = str(self._n)
        self._n += 1
        return i

    def box(self, value: str, x: float, y: float, w: float, h: float, style: str) -> str:
        i = self.id()
        self.cells.append(
            f'<mxCell id="{i}" value="{escape(value)}" style="{style}" vertex="1" parent="1">'
            f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'
        )
        return i

    def child(
        self, parent: str, value: str, x: float, y: float, w: float, h: float, style: str
    ) -> str:
        i = self.id()
        self.cells.append(
            f'<mxCell id="{i}" value="{escape(value)}" style="{style}" vertex="1" parent="{parent}">'
            f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'
        )
        return i

    def edge(
        self,
        source: str,
        target: str,
        label: str = "",
        dashed: bool = False,
        extra: str = "",
    ) -> str:
        i = self.id()
        style = (DASH if dashed else EDGE) + extra
        value = escape(label)
        self.cells.append(
            f'<mxCell id="{i}" value="{value}" style="{style}" edge="1" parent="1" source="{source}" target="{target}">'
            f'<mxGeometry relative="1" as="geometry"/></mxCell>'
        )
        return i

    def xml(self) -> str:
        did = uuid.uuid4().hex[:16]
        body = "\n".join(self.cells)
        return f"""  <diagram id="{did}" name="{escape(self.name)}">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{self.width}" pageHeight="{self.height}" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        {body}
      </root>
    </mxGraphModel>
  </diagram>"""


def page_architecture() -> Diagram:
    d = Diagram("1. System architecture", 1600, 1100)
    d.box("Ticketing platform — system architecture (v1.2)", 40, 20, 1520, 44, TITLE)
    d.box(
        "One Express API for every client. Next.js is UI only. Mobile is post-v1. Hosted on one GoDaddy/Hostinger VPS.",
        40, 72, 1520, 28, SUBTITLE,
    )

    d.box("Clients", 40, 120, 1520, 170, GROUP)
    web = d.box(
        "<b>Web — Next.js App Router</b><br>Super Admin · Project Head<br>Member · Customer<br>TanStack Query · shared Zod",
        80, 160, 420, 110, CLIENT,
    )
    mobile = d.box(
        "<b>Mobile — Expo (post-v1)</b><br>Member · Customer · Project Head<br>Same api-client and permissions",
        560, 160, 420, 110, CLIENT,
    )
    d.box(
        "<b>packages/shared + api-client</b><br>Zod schemas · enums · permissions.ts · error codes<br>Typed HTTP client",
        1040, 160, 480, 110, MODULE,
    )

    d.box("Express modular monolith  ·  /api/v1  ·  HTTPS · REST · JWT", 40, 320, 1520, 280, GROUP)
    pipe = d.box(
        "<b>Request pipeline</b><br>authenticate → loadProjectRole → authorize(perm)<br>→ validate(Zod) → controller → service → Mongoose",
        80, 365, 500, 90, API,
    )
    d.box("Auth", 80, 480, 140, 90, MODULE)
    d.box("Projects", 240, 480, 140, 90, MODULE)
    d.box("Users", 400, 480, 140, 90, MODULE)
    d.box("Memberships", 560, 480, 160, 90, MODULE)
    m5 = d.box("Tickets<br>create · assign · status", 740, 480, 220, 90, MODULE)
    d.box("Insights", 980, 480, 140, 90, MODULE)
    m7 = d.box("Notifications<br>in-process SMTP", 1140, 480, 180, 90, MODULE)
    bus = d.box(
        "<b>In-process event bus</b><br>user.invited<br>ticket.assigned<br>ticket.status_changed",
        1340, 365, 180, 205, WORKER,
    )

    mongo = d.box(
        "<b>MongoDB Atlas M0</b><br>Mongoose · users, projects,<br>members, tickets, tokens",
        80, 640, 320, 130, DATA,
    )
    vps = d.box(
        "<b>One VPS</b><br>Hostinger KVM or GoDaddy<br>Next + Express + Caddy TLS",
        440, 640, 300, 130, PROCESS,
    )
    mail = d.box(
        "<b>Domain SMTP</b><br>Nodemailer · mailbox<br>no-reply@yourdomain.com<br>invite · assign · status",
        780, 640, 300, 130, WORKER,
    )
    d.box("<b>pino stdout</b><br>x-request-id<br>no Sentry in v1", 1120, 640, 220, 130, PROCESS)

    d.edge(web, pipe, "HTTPS · cookie refresh")
    d.edge(mobile, pipe, "Bearer (later)", dashed=True)
    d.edge(pipe, m5, "")
    d.edge(m5, bus, "events")
    d.edge(m7, mail, "Nodemailer")
    d.edge(m5, mongo, "")
    d.edge(vps, pipe, "hosts", dashed=True)

    d.box(
        "<b>v1 cut:</b> web only · domain SMTP · no billing · no orgId · no push · comments/files/activity deferred. "
        "CI: GitHub Actions free. No Vercel, Render, R2, or Resend.",
        40, 800, 1520, 70, NOTE,
    )
    return d


def page_product_flow() -> Diagram:
    d = Diagram("2. Product flow", 1700, 1200)
    d.box("Product flow — from invite to a closed ticket", 40, 20, 1620, 44, TITLE)
    d.box(
        "Swimlanes by actor. Super Admin is a user flag; project roles are project_head, member, customer.",
        40, 72, 1620, 28, SUBTITLE,
    )

    d.box("Super Admin", 40, 120, 1620, 170, SWIM)
    sa1 = d.box("Seed first\nSuper Admin", 70, 170, 140, 90, SA)
    sa2 = d.box("Create project\nkey, types, dates", 250, 170, 160, 90, SA)
    sa3 = d.box("Invite user\nemail, 72h token", 450, 170, 160, 90, SA)
    sa4 = d.box("Add user to project\nset role", 650, 170, 160, 90, SA)
    sa5 = d.box("Optional: also add\nself as Member", 850, 170, 160, 90, PROCESS)
    sa6 = d.box("Multi-project\ndashboard", 1050, 170, 160, 90, MODULE)
    d.edge(sa1, sa2, "")
    d.edge(sa2, sa3, "")
    d.edge(sa3, sa4, "")
    d.edge(sa4, sa5, "")
    d.edge(sa2, sa6, "insights", dashed=True)

    d.box("Project Head  (per project)", 40, 310, 1620, 170, SWIM)
    ph1 = d.box("Manage members\nof this project", 70, 360, 160, 90, PH)
    ph2 = d.box("Create ticket\nPAY-0001", 270, 360, 150, 90, PH)
    ph3 = d.box("Assign to a\nMember", 460, 360, 140, 90, PH)
    ph4 = d.box("Reassign / unassign\n(not closed)", 640, 360, 160, 90, PH)
    ph5 = d.box("Close or reopen\nstatus", 840, 360, 140, 90, PH)
    d.box("Project insights", 1030, 360, 140, 90, MODULE)
    d.edge(ph1, ph2, "")
    d.edge(ph2, ph3, "")
    d.edge(ph3, ph4, "")
    d.edge(ph4, ph5, "")

    d.box("Customer  (per project)", 40, 500, 1620, 170, SWIM)
    c1 = d.box("Accept invite\nset password", 70, 550, 150, 90, CUSTOMER)
    c2 = d.box("Create ticket\n(own)", 260, 550, 140, 90, CUSTOMER)
    c3 = d.box("See own tickets\nunless customerSeesAllTickets", 440, 550, 220, 90, CUSTOMER)
    c4 = d.box("Edit own details\nuntil closed", 700, 550, 150, 90, CUSTOMER)
    d.box("Comments / files\ndeferred post-v1", 890, 550, 160, 90, PROCESS)
    d.edge(c1, c2, "")
    d.edge(c2, c3, "")
    d.edge(c3, c4, "")

    d.box("Member  (only assignable role)", 40, 690, 1620, 170, SWIM)
    mb1 = d.box("Create ticket", 70, 740, 130, 90, MEMBER)
    mb2 = d.box("Assigned to me\nqueue", 240, 740, 140, 90, MEMBER)
    mb3 = d.box("Update status\non assigned", 420, 740, 150, 90, MEMBER)
    mb4 = d.box("Cannot assign\nor edit details", 610, 740, 150, 90, PROCESS)
    d.edge(mb1, mb2, "")
    d.edge(mb2, mb3, "")
    d.edge(mb3, mb4, "")

    d.box("Domain SMTP  (Nodemailer, in-process — no extra worker)", 40, 880, 1620, 150, SWIM)
    e1 = d.box("user.invited\n→ invitee", 70, 930, 160, 80, WORKER)
    e2 = d.box("ticket.assigned\n→ assignee", 280, 930, 160, 80, WORKER)
    e3 = d.box("ticket.status_changed\n→ creator + assignee", 490, 930, 200, 80, WORKER)
    e4 = d.box("Mailbox\nno-reply@yourdomain.com\nGoDaddy / Hostinger SMTP", 740, 930, 250, 80, PROCESS)

    d.edge(sa3, e1, "", dashed=True)
    d.edge(ph3, e2, "", dashed=True)
    d.edge(mb3, e3, "", dashed=True)
    d.edge(e3, e4, "send")
    d.edge(sa4, ph1, "membership", dashed=True)
    d.edge(ph3, mb2, "assigneeId", dashed=True)
    return d


def page_ticket_lifecycle() -> Diagram:
    d = Diagram("3. Ticket lifecycle", 1600, 1100)
    d.box("Ticket lifecycle and status machine", 40, 20, 1520, 44, TITLE)
    d.box(
        "Tickets do not reuse project statuses. Closed is read-only except Super Admin / Project Head reopen.",
        40, 72, 1520, 28, SUBTITLE,
    )

    start = d.box("Create ticket\nSA / PH / Customer / Member\ntype ∈ project.ticketTypes", 40, 140, 220, 90, PROCESS)
    open_s = d.box("open", 340, 155, 140, 60, STATUS["open"])
    ip = d.box("in_progress", 620, 80, 160, 60, STATUS["in_progress"])
    hold = d.box("on_hold", 620, 250, 160, 60, STATUS["on_hold"])
    resolved = d.box("resolved", 940, 155, 150, 60, STATUS["resolved"])
    closed = d.box("closed", 1240, 155, 140, 60, STATUS["closed"])

    d.edge(start, open_s, "default")
    d.edge(open_s, ip, "SA / PH / assigned Member\nassignee required")
    d.edge(open_s, hold, "SA / PH / assigned Member")
    d.edge(ip, hold, "")
    d.edge(hold, ip, "assignee required")
    d.edge(hold, open_s, "SA / PH only")
    d.edge(ip, resolved, "SA / PH / assigned Member")
    d.edge(resolved, closed, "SA / PH")
    d.edge(resolved, ip, "reopen · SA / PH")
    d.edge(closed, open_s, "reopen · SA / PH")

    d.box(
        "<b>Assign / unassign</b><br>SA or Project Head · any non-closed ticket<br>assignee must be role <b>member</b> in that project",
        40, 400, 360, 120, PH,
    )
    d.box(
        "<b>Resource rules</b><br>Customer edits own, not closed<br>Member status only if assigned<br>Customer list = own unless customerSeesAllTickets<br>Read-only project → 409 PROJECT_READ_ONLY",
        430, 400, 400, 120, NOTE,
    )
    d.box(
        "<b>Deferred post-v1</b><br>Comments · attachments · activity timeline<br>No object storage in v1. Audit = createdAt / updatedAt only.",
        860, 400, 400, 120, TICKET,
    )
    d.box(
        "<b>Display ID</b><br>Mongo $inc project.ticketSeq<br>PAY-0001 (4-digit pad, then grows)<br>unique (projectId, displayId) · key unique",
        1290, 400, 270, 120, DATA,
    )

    d.box(
        "<b>Project statuses (separate):</b> todo · ongoing · completed · on_hold · scrapped. "
        "completed / scrapped / past endDate → project is read-only. "
        "Invalid ticket transition → 409 INVALID_TRANSITION. Missing assignee into in_progress → 409 ASSIGNEE_REQUIRED.",
        40, 560, 1520, 70, NOTE,
    )

    d.box("Who can change status", 40, 660, 1520, 44, TITLE)
    d.box("open → in_progress / on_hold", 40, 730, 280, 70, STATUS["open"])
    d.box("SA · PH · assigned Member", 40, 810, 280, 50, PROCESS)
    d.box("in_progress → resolved / on_hold", 360, 730, 300, 70, STATUS["in_progress"])
    d.box("SA · PH · assigned Member", 360, 810, 300, 50, PROCESS)
    d.box("resolved → closed / reopen", 700, 730, 280, 70, STATUS["resolved"])
    d.box("SA · PH only", 700, 810, 280, 50, PROCESS)
    d.box("closed → open (reopen)", 1020, 730, 240, 70, STATUS["closed"])
    d.box("SA · PH only", 1020, 810, 240, 50, PROCESS)
    d.box("Customer never\nchanges status", 1300, 730, 200, 130, CUSTOMER)
    return d


def page_auth() -> Diagram:
    d = Diagram("4. Auth and authorization", 1600, 1100)
    d.box("Authentication, tokens, and request authorization", 40, 20, 1520, 44, TITLE)

    d.box("Login / invite / reset", 40, 90, 1520, 250, GROUP)
    a1 = d.box("POST /auth/login\nemail + password\nbcrypt / argon2", 70, 140, 200, 80, PROCESS)
    a2 = d.box("Access JWT\n15 min · { sub, isSuperAdmin }", 300, 140, 220, 80, API)
    a3 = d.box("Refresh token\n14 days · hashed at rest\nrotated every use", 550, 140, 230, 80, API)
    a4 = d.box("Web: httpOnly Secure\nSameSite=Lax cookie", 810, 140, 200, 80, CLIENT)
    a5 = d.box("Mobile later:\nSecureStore + Bearer", 1040, 140, 200, 80, CLIENT)
    a6 = d.box("Reuse of revoked\nrefresh → revoke family", 1270, 140, 250, 80, NOTE)
    d.edge(a1, a2, "")
    d.edge(a2, a3, "")
    d.edge(a3, a4, "web")
    d.edge(a3, a5, "post-v1", dashed=True)
    d.edge(a3, a6, "", dashed=True)

    b1 = d.box("POST /users\ninvite · 72h SMTP", 70, 240, 160, 70, SA)
    b2 = d.box("POST /auth/invite/accept\nset password", 270, 240, 200, 70, PROCESS)
    b3 = d.box("POST /auth/forgot-password\nSMTP, always 202", 510, 240, 210, 70, PROCESS)
    b4 = d.box("POST /auth/reset-password\n1h token", 760, 240, 190, 70, PROCESS)
    b5 = d.box("POST /auth/logout\nrevoke refresh", 990, 240, 180, 70, PROCESS)
    d.box("GET /me\nuser + memberships", 1210, 240, 190, 70, PROCESS)
    d.edge(b1, b2, "")
    d.edge(b3, b4, "")

    d.box("Every project-scoped request", 40, 370, 1520, 280, GROUP)
    p1 = d.box("1. authenticate\nverify JWT\nreject if disabled", 70, 430, 200, 90, PROCESS)
    p2 = d.box("2. loadProjectRole\nmembership row → req.role\nSA → super_admin\neven without membership", 310, 430, 240, 90, PROCESS)
    p3 = d.box("3. authorize(perm)\ncan(role, perm)\nelse 403", 590, 430, 180, 90, PROCESS)
    p4 = d.box("4. validate\nshared Zod schema", 810, 430, 180, 90, PROCESS)
    p5 = d.box("5. service\nresource rules\n(own / assigned / setting)", 1030, 430, 220, 90, API)
    p6 = d.box("6. Mongoose\ncommit", 1290, 430, 180, 90, DATA)
    d.edge(p1, p2, "")
    d.edge(p2, p3, "")
    d.edge(p3, p4, "")
    d.edge(p4, p5, "")
    d.edge(p5, p6, "")

    d.box("Assignee is Member\nin this project", 70, 540, 200, 80, MEMBER)
    d.box("Customer: creatorId = me\nand not closed", 300, 540, 210, 80, CUSTOMER)
    d.box("Member status:\nassigneeId = me", 540, 540, 180, 80, MEMBER)
    d.box("Customer list: own tickets\nor all if setting on", 750, 540, 230, 80, CUSTOMER)
    d.box("Legal status transition\nelse 409", 1010, 540, 180, 80, NOTE)
    d.box("Read-only project\n409 PROJECT_READ_ONLY", 1220, 540, 230, 80, NOTE)

    d.box(
        "<b>Rate limits:</b> auth 10 / 15 min / IP · writes 120 / min / user · reads 300 / min / user. "
        "CORS allow-list: web origins only. No public sign-up. Bootstrap admin from env if users collection is empty.",
        40, 680, 1520, 60, NOTE,
    )

    d.box("isSuperAdmin — platform", 40, 770, 360, 50, SA)
    d.box("project_head — operate one project", 430, 770, 360, 50, PH)
    d.box("member — only assignable role", 820, 770, 340, 50, MEMBER)
    d.box("customer — requester, never assigned", 1190, 770, 370, 50, CUSTOMER)
    d.box(
        "Exactly one project role per (user, project). Super Admin may also be added as Member in a project to take work.",
        40, 840, 1520, 50, SUBTITLE,
    )
    return d


def page_data_model() -> Diagram:
    d = Diagram("5. Data model", 1700, 1100)
    d.box("MongoDB data model (Mongoose)", 40, 20, 1620, 44, TITLE)
    d.box(
        "No orgId in v1. Soft-delete projects. Comments, attachments, and activity collections are deferred.",
        40, 72, 1620, 28, SUBTITLE,
    )

    def entity(title: str, attrs: list[str], x: float, y: float, w: float = 230) -> str:
        h = 30 + 22 * len(attrs)
        parent = d.box(title, x, y, w, h, ENTITY)
        for i, a in enumerate(attrs):
            style = PK if i == 0 or "UNIQUE" in a or a.startswith("_id") else ATTR
            d.child(parent, a, 0, 30 + i * 22, w, 22, style)
        return parent

    users = entity(
        "users",
        [
            "_id  ObjectId",
            "email  unique",
            "passwordHash  nullable",
            "isSuperAdmin  bool",
            "status  active|invited|disabled",
            "name · timestamps",
        ],
        40, 120, 250,
    )
    projects = entity(
        "projects",
        [
            "_id  ObjectId",
            "key  unique  PAY",
            "title · description",
            "status  todo|ongoing|…|scrapped",
            "ticketTypes  enum[]",
            "customerSeesAllTickets",
            "ticketSeq  int",
            "isDeleted  bool",
        ],
        360, 120, 260,
    )
    members = entity(
        "projectMembers",
        [
            "_id  ObjectId",
            "projectId",
            "userId",
            "role  head|member|customer",
            "UNIQUE (projectId, userId)",
        ],
        700, 120, 250,
    )
    tickets = entity(
        "tickets",
        [
            "_id  ObjectId",
            "projectId",
            "displayId  PAY-0001",
            "type · title · description",
            "status  open|…|closed",
            "priority  low|medium|high",
            "dueDate · assigneeId · creatorId",
            "UNIQUE (projectId, displayId)",
        ],
        1020, 120, 280,
    )
    refresh = entity(
        "refreshTokens",
        ["_id  ObjectId", "userId", "tokenHash", "expiresAt · revokedAt"],
        40, 430, 240,
    )
    invites = entity(
        "invite / reset tokens",
        ["_id  ObjectId", "userId", "tokenHash", "expiresAt · usedAt"],
        320, 430, 240,
    )
    deferred = d.box(
        "<b>Deferred post-v1</b><br>ticketComments<br>ticketAttachments<br>ticketActivities<br>(no R2 / GridFS in v1)",
        600, 430, 280, 150, TICKET,
    )

    d.edge(users, members, "1 : N")
    d.edge(projects, members, "1 : N")
    d.edge(projects, tickets, "1 : N")
    d.edge(users, tickets, "creator / assignee")
    d.edge(users, refresh, "1 : N")
    d.edge(users, invites, "1 : N")
    d.edge(tickets, deferred, "later", dashed=True)

    d.box(
        "<b>Cardinality:</b> users 1—N projectMembers N—1 projects 1—N tickets. "
        "Member remove / role change away from member is blocked (409 MEMBER_HAS_OPEN_TICKETS) while they hold open assigned tickets, unless reassigned in the same request. "
        "Disabled users keep assignments until someone reassigns. Ticket IDs use atomic $inc on project.ticketSeq.",
        40, 640, 1620, 80, NOTE,
    )
    return d


def page_delivery() -> Diagram:
    d = Diagram("6. Delivery (v1)", 1600, 1000)
    d.box("Delivery plan — MVP is phases 1–5 (web only)", 40, 20, 1520, 44, TITLE)

    p1 = d.box(
        "<b>1 Foundation</b><br>monorepo · Express · Mongo<br>auth · GET /me · CI · Docker<br>invite SMTP · seed Super Admin",
        40, 120, 230, 150, MODULE,
    )
    p2 = d.box(
        "<b>2 Projects</b><br>CRUD · key · types<br>soft-delete / restore<br>read-only rules",
        300, 120, 230, 150, MODULE,
    )
    p3 = d.box(
        "<b>3 Users</b><br>invite via SMTP<br>memberships · roles<br>remove guards",
        560, 120, 230, 150, MODULE,
    )
    p4 = d.box(
        "<b>4 Tickets</b><br>IDs · assign · status<br>web screens<br>no comments/files",
        820, 120, 230, 150, API,
    )
    p5 = d.box(
        "<b>5 Insights + mail</b><br>dashboards<br>assign/status SMTP<br>customer panel",
        1080, 120, 230, 150, WORKER,
    )
    p6 = d.box("<b>6 Mobile</b><br>post-v1 Expo", 1340, 120, 200, 150, CLIENT)
    d.edge(p1, p2, "")
    d.edge(p2, p3, "")
    d.edge(p3, p4, "")
    d.edge(p4, p5, "MVP")
    d.edge(p5, p6, "later", dashed=True)

    d.box(
        "<b>Out of v1:</b> comments · attachments · activity · billing / orgId · push · MFA / SSO · webhooks · SLA · tags · custom fields · websockets.",
        40, 310, 1520, 60, NOTE,
    )
    d.box(
        "<b>Phase 8 (later):</b> comments, attachments, activity timeline, object storage, comment email.",
        40, 390, 1520, 50, PROCESS,
    )
    d.box(
        "<b>Stack:</b> Next.js · Express (or NestJS) · MongoDB + Mongoose · Zod · JWT · bcrypt/argon2 · Turborepo/Nx + pnpm · Nodemailer + domain SMTP.",
        40, 460, 1520, 60, API,
    )
    d.box(
        "<b>Host:</b> paid GoDaddy/Hostinger domain + one VPS · Atlas M0 · mailbox SMTP · Let’s Encrypt. No Vercel, Render, R2, Resend, or Sentry.",
        40, 540, 1520, 60, NOTE,
    )
    return d


def write_mxfile(pages: list[Diagram], path: Path) -> None:
    diagrams = "\n".join(p.xml() for p in pages)
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" agent="Ticket_sys revised plan v1.2" version="22.1.0" type="device" pages="{len(pages)}">
{diagrams}
</mxfile>
"""
    path.write_text(xml, encoding="utf-8")
    print(f"wrote {path} ({path.stat().st_size} bytes)")


def main() -> None:
    pages = [
        page_architecture(),
        page_product_flow(),
        page_ticket_lifecycle(),
        page_auth(),
        page_data_model(),
        page_delivery(),
    ]
    write_mxfile(pages, OUT / "ticketing-v1.2.drawio")
    names = [
        "01-system-architecture.drawio",
        "02-product-flow.drawio",
        "03-ticket-lifecycle.drawio",
        "04-auth-authorization.drawio",
        "05-data-model.drawio",
        "06-delivery-v1.drawio",
    ]
    for name, page in zip(names, pages):
        write_mxfile([page], OUT / name)


if __name__ == "__main__":
    main()
