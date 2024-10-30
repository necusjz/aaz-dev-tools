import json
import logging
import os
import re

from command.model.configuration import CMDHelp, CMDCommandExample
from command.model.specs import CMDSpecsCommandGroup, CMDSpecsCommand, CMDSpecsResource, CMDSpecsCommandVersion, \
    CMDSpecsCommandTree
from command.model.specs._command_tree import CMDSpecsSimpleCommand, CMDSpecsSimpleCommandGroup, \
    CMDSpecsSimpleCommandTree
from utils import exceptions

logger = logging.getLogger(__name__)


def _build_simple_command(names):
    # uri = '/Commands/' + '/'.join(names[:-1]) + f'/_{names[-1]}.md'
    command = CMDSpecsSimpleCommand()
    command.names = names
    return command


def _build_simple_command_group(names, aaz_path):
    """
    Build Simple Command Group from directory
    """
    rel_names = names
    if len(names) == 1 and names[0] == 'aaz':
        rel_names = []
    # uri = '/Commands/' + '/'.join(rel_names) + f'/readme.md'
    full_path = os.path.join(aaz_path, 'Commands', *rel_names)
    commands = {}
    command_groups = {}
    for dir in os.listdir(full_path):
        if os.path.isfile(os.path.join(full_path, dir)):
            if dir == 'readme.md' or dir == 'tree.json':
                continue
            command_name = dir[1:-3]
            commands[command_name] = _build_simple_command(rel_names + [command_name])
        else:
            cg_name = dir
            command_groups[cg_name] = _build_simple_command_group(rel_names + [cg_name], aaz_path)
    cg = CMDSpecsSimpleCommandGroup()
    cg.names = names
    cg.commands = commands
    cg.command_groups = command_groups
    return cg


def build_simple_command_tree(aaz_path):
    root = _build_simple_command_group(['aaz'], aaz_path)
    tree = CMDSpecsSimpleCommandTree()
    tree.root = root
    tree.validate()
    return tree


class CMDSpecsPartialCommandGroup:
    def __init__(self, names, short_help, uri, aaz_path):
        self.names = names
        self.short_help = short_help
        self.uri = uri
        self.aaz_path = aaz_path

    @classmethod
    def parse_command_group_info(cls, info, cg_names, aaz_path):
        prev_line = None
        title = None
        short_help = None
        long_help = []
        cur_sub_block = None
        block_items = None
        command_groups = []
        commands = []
        in_code_block = False

        for line in info.splitlines(keepends=False):
            line = line.strip()

            if line.startswith('"""'):
                in_code_block = not in_code_block
                continue
            elif in_code_block:
                continue

            if line.startswith("# ") and not title:
                title = line[2:]
            elif line.startswith("## "):
                cur_sub_block = line[3:]
                if cur_sub_block in ["Groups", "Subgroups"]:
                    block_items = command_groups
                elif cur_sub_block in ["Commands"]:
                    block_items = commands
                else:
                    block_items = None
            elif line and not cur_sub_block and not short_help:
                short_help = line
            elif line and not cur_sub_block and not long_help and prev_line:
                short_help = short_help + '\n' + line
            elif line and not cur_sub_block:
                long_help.append(line)
            elif line.startswith('- ['):
                name = line[3:].split(']')[0]
                uri = line.split('(')[-1].split(')')[0]
                if cur_sub_block in ["Groups", "Subgroups"]:
                    item = CMDSpecsPartialCommandGroup([*cg_names, name], None, uri, aaz_path)
                elif cur_sub_block in ["Commands"]:
                    item = CMDSpecsPartialCommand([*cg_names, name], None, uri, aaz_path)
                else:
                    continue
                if block_items is not None:
                    block_items.append((name, item))
            elif line.startswith(': '):
                if block_items:
                    block_items[-1][1].short_help = line[2:]
            elif line and prev_line:
                if block_items:
                    block_items[-1][1].short_help += '\n' + line
            prev_line = line
        cg = CMDSpecsCommandGroup()
        if not cg_names:
            cg.names = ["aaz"]
        else:
            cg.names = list(cg_names)
        if not short_help:
            cg.help = None
        else:
            cg.help = CMDHelp()
            cg.help.short = short_help
            cg.help.lines = long_help if long_help else None
        cg.command_groups = CMDSpecsCommandGroupDict(command_groups)
        cg.commands = CMDSpecsCommandDict(commands)
        return cg

    def load(self):
        with open(self.aaz_path + self.uri, "r", encoding="utf-8") as f:
            content = f.read()
            if self.names and self.names[0] == "aaz":
                names = self.names[1:]
            else:
                names = self.names
            cg = self.parse_command_group_info(content, names, self.aaz_path)
            return cg


class CMDSpecsCommandDict(dict):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def __getitem__(self, __key):
        command = super().__getitem__(__key)
        if isinstance(command, CMDSpecsPartialCommand):
            command = command.load()
            if command:
                super().__setitem__(__key, command)
        return command

    def items(self):
        for key in self.keys():
            yield key, self[key]

    def values(self):
        for key in self.keys():
            yield self[key]

    def get_raw_item(self, key):
        return super().get(key)

    def raw_values(self):
        return super().values()

    def raw_items(self):
        return super().items()


class CMDSpecsCommandGroupDict(dict):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def __getitem__(self, __key):
        cg = super().__getitem__(__key)
        if isinstance(cg, CMDSpecsPartialCommandGroup):
            cg = cg.load()
            if cg:
                super().__setitem__(__key, cg)
        return cg

    def items(self):
        for key in self.keys():
            yield key, self[key]

    def values(self):
        for key in self.keys():
            yield self[key]

    def get_raw_item(self, key):
        return super().get(key)

    def raw_values(self):
        return super().values()

    def raw_items(self):
        return super().items()


class CMDSpecsPartialCommand:
    _COMMAND_INFO_RE = r"# \[Command\] _(?P<group_name>[A-Za-z0-9- ]+)_\n" \
                       r"\n(?P<short_help>(.+\n)+)\n?" \
                       r"(?P<lines_help>\n(^[^#].*\n)+)?" \
                       r"\n## Versions\n" \
                       r"(?P<versions>(\n### \[(?P<version_name>[a-zA-Z0-9-]+)\]\(.*\) \*\*.*\*\*\n" \
                       r"\n(<!-- .* -->\n)+" \
                       r"(?P<examples>\n#### examples\n" \
                       r"(\n- (?P<example_desc>.*)\n" \
                       r"    ```bash\n" \
                       r"(        (?P<example_cmd>.*)\n)+" \
                       r"    ```\n)+)?)+)"
    COMMAND_INFO_RE = re.compile(_COMMAND_INFO_RE, re.MULTILINE)
    _RESOURCE_INFO_RE = r"<!-- (?P<plane>\S+) (?P<id>\S+) (?P<version>\S+) ((?P<subresource>\S+) )?-->\n"
    RESOURCE_INFO_RE = re.compile(_RESOURCE_INFO_RE, re.MULTILINE)
    _VERSION_INFO_RE = r"### \[(?P<version_name>[a-zA-Z0-9-]+)\]\(.*\) \*\*(?P<stage>.*)\*\*\n" \
                       r"\n(?P<resources>(<!-- .* -->\n)+)" \
                       r"(?P<examples>\n#### examples\n" \
                       r"(\n- (?P<example_desc>.*)\n" \
                       r"    ```bash\n" \
                       r"(        (?P<example_cmd>.*)\n)+" \
                       r"    ```\n)+)?"
    VERSION_INFO_RE = re.compile(_VERSION_INFO_RE, re.MULTILINE)
    _EXAMPLE_INFO_RE = r"- (?P<example_desc>.*)\n" \
                       r"    ```bash\n" \
                       r"(?P<example_cmds>(        (.*)\n)+)" \
                       r"    ```\n"
    EXAMPLE_INFO_RE = re.compile(_EXAMPLE_INFO_RE, re.MULTILINE)
    _EXAMPLE_LINE_RE = r"        (?P<example_cmd>.*)\n"
    EXAMPLE_LINE_RE = re.compile(_EXAMPLE_LINE_RE, re.MULTILINE)

    def __init__(self, names, short_help, uri, aaz_path):
        self.names = names
        self.short_help = short_help
        self.uri = uri
        self.aaz_path = aaz_path

    def load(self):
        with open(self.aaz_path + self.uri, "r", encoding="utf-8") as f:
            content = f.read()
            command = self.parse_command_info(content, self.names)
            return command

    @classmethod
    def parse_command_info(cls, info, cmd_names):
        command_match = re.match(cls.COMMAND_INFO_RE, info)
        if not command_match:
            logger.warning(f"Invalid command info markdown: \n{info}")
            return None
        if command_match.group("lines_help"):
            lines_help = command_match.group("lines_help").strip().split("\n")
        else:
            lines_help = None
        help = CMDHelp()
        help.short = command_match.group("short_help").strip()
        help.lines = lines_help
        versions = []
        for version_match in re.finditer(cls.VERSION_INFO_RE, info):
            resources = []
            for resource_match in re.finditer(cls.RESOURCE_INFO_RE, version_match.group("resources")):
                resource = {
                    "plane": resource_match.group("plane"),
                    "id": resource_match.group("id"),
                    "version": resource_match.group("version"),
                }
                if resource_match.group("subresource"):
                    resource["subresource"] = resource_match.group("subresource")
                resources.append(CMDSpecsResource(raw_data=resource))
            examples = []
            for example_match in re.finditer(cls.EXAMPLE_INFO_RE, version_match.group("examples") or ''):
                example_cmd = []
                for line_match in re.finditer(cls.EXAMPLE_LINE_RE, example_match.group("example_cmds") or ''):
                    example_cmd.append(line_match.group("example_cmd"))
                example = {
                    "name": example_match.group("example_desc"),
                    "commands": example_cmd
                }
                examples.append(CMDCommandExample(raw_data=example))
            version = {
                "name": version_match.group("version_name"),
                "resources": resources,
                "examples": examples
            }
            if version_match.group("stage"):
                version["stage"] = version_match.group("stage")
            versions.append(CMDSpecsCommandVersion(raw_data=version))
        command = CMDSpecsCommand()
        command.names = cmd_names
        command.help = help
        command.versions = sorted(versions, key=lambda v: v.name)
        return command


class CMDSpecsPartialCommandTree:
    def __init__(self, aaz_path, root=None):
        self.aaz_path = aaz_path
        self._root = root or CMDSpecsPartialCommandGroup(names=["aaz"], short_help='', uri="/Commands/readme.md",
                                                         aaz_path=aaz_path).load()
        self._modified_command_groups = set()
        self._modified_commands = set()

    @property
    def root(self):
        if isinstance(self._root, CMDSpecsPartialCommandGroup):
            self._root = self._root.load()
        return self._root

    @property
    def simple_tree(self):
        """
        Build and Return a Simple Command Tree from Folder Structure
        """
        return build_simple_command_tree(self.aaz_path)

    def find_command_group(self, *cg_names):
        """
        Find command group node by names

        :param cg_names: command group names
        :return: command group node
        :rtype: CMDSpecsCommandGroup | None
        """
        node = self.root
        idx = 0
        while idx < len(cg_names):
            name = cg_names[idx]
            if not node.command_groups or name not in node.command_groups:
                return None
            node = node.command_groups[name]
            idx += 1
        return node

    def find_command(self, *cmd_names):
        if len(cmd_names) < 2:
            raise exceptions.InvalidAPIUsage(f"Invalid command name: '{' '.join(cmd_names)}'")

        node = self.find_command_group(*cmd_names[:-1])
        if not node:
            return None
        name = cmd_names[-1]
        if not node.commands or name not in node.commands:
            return None
        leaf = node.commands[name]
        return leaf

    def iter_command_groups(self, *root_cg_names):
        root = self.find_command_group(*root_cg_names)
        if root:
            nodes = [root]
            i = 0
            while i < len(nodes):
                yield nodes[i]
                for node in (nodes[i].command_groups or {}).values():
                    nodes.append(node)
                i += 1

    def iter_commands(self, *root_node_names):
        for node in self.iter_command_groups(*root_node_names):
            for leaf in (node.commands or {}).values():
                yield leaf

    def create_command_group(self, *cg_names):
        if len(cg_names) < 1:
            raise exceptions.InvalidAPIUsage(f"Invalid Command Group name: '{' '.join(cg_names)}'")
        node = self.root
        idx = 0
        while idx < len(cg_names):
            name = cg_names[idx]
            if node.commands and name in node.commands:
                raise exceptions.InvalidAPIUsage(f"Invalid Command Group name: conflict with Command name: "
                                                 f"'{' '.join(cg_names[:idx+1])}'")
            if not node.command_groups or name not in node.command_groups:
                if not node.command_groups:
                    node.command_groups = {}
                names = [*cg_names[:idx+1]]
                node.command_groups[name] = CMDSpecsCommandGroup({
                    "names": names
                })
                self._modified_command_groups.add(cg_names[:idx+1])
            node = node.command_groups[name]
            idx += 1
        return node

    def update_command_group_by_ws(self, ws_node):
        command_group = self.create_command_group(*ws_node.names)
        if ws_node.help:
            if not command_group.help:
                command_group.help = CMDHelp()
            if ws_node.help.short:
                command_group.help.short = ws_node.help.short
            if ws_node.help.lines:
                command_group.help.lines = [*ws_node.help.lines]
        self._modified_command_groups.add(tuple([*ws_node.names]))
        return command_group

    def delete_command_group(self, *cg_names):
        for _ in self.iter_commands(*cg_names):
            raise exceptions.ResourceConflict("Cannot delete command group with commands")
        parent = self.find_command_group(*cg_names[:-1])
        name = cg_names[-1]
        if not parent or not parent.command_groups or name not in parent.command_groups:
            return False
        del parent.command_groups[name]
        if not parent.command_groups:
            parent.command_groups = None

        self._modified_command_groups.add(cg_names)

        if not parent.command_groups and not parent.commands:
            # delete empty parent command group
            self.delete_command_group(*cg_names[:-1])
        return True

    def create_command(self, *cmd_names):
        if len(cmd_names) < 2:
            raise exceptions.InvalidAPIUsage(f"Invalid Command name: '{' '.join(cmd_names)}'")
        node = self.create_command_group(*cmd_names[:-1])
        name = cmd_names[-1]
        if node.command_groups and name in node.command_groups:
            raise exceptions.InvalidAPIUsage(f"Invalid Command name: conflict with Command Group name: "
                                             f"'{' '.join(cmd_names)}'")
        if not node.commands:
            node.commands = {}
        elif name in node.commands:
            return node.commands[name]

        command = CMDSpecsCommand()
        command.names = list(cmd_names)
        node.commands[name] = command
        self._modified_commands.add(cmd_names)

        return command

    def delete_command(self, *cmd_names):
        if len(cmd_names) < 2:
            raise exceptions.InvalidAPIUsage(f"Invalid Command name: '{' '.join(cmd_names)}'")
        parent = self.find_command_group(*cmd_names[:-1])
        name = cmd_names[-1]
        if not parent or not parent.commands or name not in parent.commands:
            return False
        command = parent.commands[name]
        if command.versions:
            raise exceptions.ResourceConflict("Cannot delete command with versions")
        del parent.commands[name]
        if not parent.commands:
            parent.commands = None

        self._modified_commands.add(cmd_names)

        if not parent.command_groups and not parent.commands:
            # delete empty parent command group
            self.delete_command_group(*cmd_names[:-1])
        return True

    def delete_command_version(self, *cmd_names, version):
        if len(cmd_names) < 2:
            raise exceptions.InvalidAPIUsage(f"Invalid Command name: '{' '.join(cmd_names)}'")
        command = self.find_command(*cmd_names)
        if not command or not command.versions:
            return False
        match_idx = None
        for idx, v in enumerate(command.versions):
            if v.name == version:
                match_idx = idx
                break
        if match_idx is None:
            return False

        command.versions = command.versions[:match_idx] + command.versions[match_idx+1:]

        self._modified_commands.add(cmd_names)

        if not command.versions:
            # delete empty command
            self.delete_command(*cmd_names)
        return True

    def update_command_version(self, *cmd_names, plane, cfg_cmd):
        command = self.create_command(*cmd_names)

        version = None
        for v in (command.versions or []):
            if v.name == cfg_cmd.version:
                version = v
                break

        if not version:
            version = CMDSpecsCommandVersion()
            version.name = cfg_cmd.version
            if not command.versions:
                command.versions = []
            command.versions.append(version)

        # update version resources
        version.resources = []
        for r in cfg_cmd.resources:
            resource = CMDSpecsResource()
            resource.plane = plane
            resource.id = r.id
            resource.version = r.version
            resource.subresource = r.subresource
            version.resources.append(resource)

        self._modified_commands.add(cmd_names)

    def update_command_by_ws(self, ws_leaf):
        command = self.find_command(*ws_leaf.names)
        if not command:
            # make sure the command exist, if command not exist, then run update_resource_cfg first
            raise exceptions.InvalidAPIUsage(f"Command isn't exist: '{' '.join(ws_leaf.names)}'")

        cmd_version = None
        for v in (command.versions or []):
            if v.name == ws_leaf.version:
                cmd_version = v
                break
        if not cmd_version:
            raise exceptions.InvalidAPIUsage(f"Command in version isn't exist: "
                                             f"'{' '.join(ws_leaf.names)}' '{ws_leaf.version}'")

        # compare resources
        leaf_resources = {(r.id, r.version) for r in ws_leaf.resources}
        cmd_version_resources = {(r.id, r.version) for r in cmd_version.resources}
        if leaf_resources != cmd_version_resources:
            raise exceptions.InvalidAPIUsage(f"The resources in version don't match the resources of workspace leaf: "
                                             f"{leaf_resources} != {cmd_version_resources}")

        # update stage
        cmd_version.stage = ws_leaf.stage

        # update examples
        if ws_leaf.examples:
            cmd_version.examples = [CMDCommandExample(e.to_primitive()) for e in ws_leaf.examples]

        # update help
        if ws_leaf.help:
            if not command.help:
                command.help = CMDHelp()
            if ws_leaf.help.short:
                command.help.short = ws_leaf.help.short
            if ws_leaf.help.lines:
                command.help.lines = [*ws_leaf.help.lines]

        self._modified_commands.add(tuple(command.names))
        return command

    def patch_partial_items(self, aaz_command_tree: CMDSpecsCommandTree):
        aaz_command_tree = CMDSpecsPartialCommandTree(self.aaz_path, aaz_command_tree.root)
        nodes = [self.root]
        i = 0
        while i < len(nodes):
            command_group = nodes[i]
            if isinstance(command_group, CMDSpecsCommandGroup):
                if isinstance(command_group.command_groups, CMDSpecsCommandGroupDict):
                    for key in command_group.command_groups.keys():
                        raw_cg = command_group.command_groups.get_raw_item(key)
                        if isinstance(raw_cg, CMDSpecsCommandGroup):
                            nodes.append(raw_cg)
                        elif isinstance(raw_cg, CMDSpecsPartialCommandGroup):
                            command_group.command_groups[key] = aaz_command_tree.find_command_group(*raw_cg.names)
                elif isinstance(command_group.command_groups, dict):
                    for cg in command_group.command_groups.values():
                        nodes.append(cg)
                if isinstance(command_group.commands, CMDSpecsCommandDict):
                    for key in command_group.commands.keys():
                        raw_command = command_group.commands.get_raw_item(key)
                        if isinstance(raw_command, CMDSpecsPartialCommand):
                            command_group.commands[key] = aaz_command_tree.find_command(*raw_command.names)
            i += 1

    def patch(self):
        tree_path = os.path.join(self.aaz_path, "Commands", "tree.json")
        if not (os.path.exists(tree_path) and os.path.isfile(tree_path)):
            return
        try:
            with open(tree_path, 'r', encoding="utf-8") as f:
                data = json.load(f)
                aaz_command_tree = CMDSpecsCommandTree(data)
            self.patch_partial_items(aaz_command_tree)
        except json.decoder.JSONDecodeError as e:
            raise ValueError(f"Invalid Command Tree file: {tree_path}") from e

    def verify_command_tree(self):
        details = {}
        for group in self.iter_command_groups():
            if group == self.root:
                continue
            if not group.help or not group.help.short:
                details[' '.join(group.names)] = {
                    'type': 'group',
                    'help': "Miss short summary."
                }

        for cmd in self.iter_commands():
            if not cmd.help or not cmd.help.short:
                details[' '.join(cmd.names)] = {
                    'type': 'command',
                    'help': "Miss short summary."
                }
        if details:
            raise exceptions.VerificationError(message="Invalid Command Tree", details=details)

    def to_model(self):
        tree = CMDSpecsCommandTree()
        tree.root = self.root
        return tree
