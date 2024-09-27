import * as React from "react";
import TreeView from '@mui/lab/TreeView';
import TreeItem from '@mui/lab/TreeItem';

import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import FolderIcon from "@mui/icons-material/Folder";
import EditIcon from '@mui/icons-material/Edit';
import { Box, Checkbox, FormControl, Typography, Select, MenuItem, styled, TypographyProps, InputLabel, IconButton } from "@mui/material";
import { CLIModViewCommand, CLIModViewCommandGroup, CLIModViewCommandGroups, CLIModViewCommands, CLIModViewProfile } from "./CLIModuleCommon";
import { CLISpecsCommand, CLISpecsCommandGroup } from "./CLIModuleGenerator";

const CommandGroupTypography = styled(Typography)<TypographyProps>(({ theme }) => ({
    color: theme.palette.primary.main,
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 17,
    fontWeight: 600,
}))

const CommandTypography = styled(Typography)<TypographyProps>(({ theme }) => ({
    color: theme.palette.primary.main,
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 20,
    fontWeight: 400,
}))

const SelectionTypography = styled(Typography)<TypographyProps>(({ theme }) => ({
    color: theme.palette.grey[700],
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 15,
    fontWeight: 400,
}))

const RegisteredTypography = styled(SelectionTypography)<TypographyProps>(({ theme }) => ({
}))

const UnregisteredTypography = styled(SelectionTypography)<TypographyProps>(({ theme }) => ({
    color: '#d9c136',
}))


interface CommandItemProps {
    command: ProfileCTCommand,
    onSelectCommand: (names: string[], selected: boolean) => void,
    onSelectCommandVersion: (names: string[], version: string) => void,
    onSelectCommandRegistered: (names: string[], registered: boolean) => void,
}

const CommandItem: React.FC<CommandItemProps> = ({
    command,
    onSelectCommand,
    onSelectCommandVersion,
    onSelectCommandRegistered,
}) => {
    const leafName = command.names[command.names.length - 1];
    return (
        <TreeItem sx={{ marginLeft: 2 }} key={command.id} nodeId={command.id} color='inherit' label={
            <Box sx={{
                marginTop: 1,
                marginBottom: 1,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-start",
            }}>
                <Checkbox
                    disableRipple
                    checked={command.selected}
                    onClick={(event) => {
                        onSelectCommand(command.names, !command.selected);
                        event.stopPropagation();
                        event.preventDefault();
                    }}
                />
                <Box sx={{
                    marginLeft: 1,
                    minWidth: 100,
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-start",
                }}>
                    <CommandTypography>{leafName}</CommandTypography>
                    <Box sx={{
                        marginLeft: 1,
                        width: 20,
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                    }}>
                        {!command.modified && command.selectedVersion !== undefined && <IconButton
                            onClick={(event) => {
                                onSelectCommand(command.names, true);
                            }}
                        >
                            <EditIcon fontSize="small" color="disabled" />
                        </IconButton>}
                        {command.modified && <EditIcon fontSize="small" color="secondary" />}
                    </Box>
                </Box>
                {command.selectedVersion !== undefined && <Box sx={{
                    marginLeft: 1,
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-start"
                }}>
                    <FormControl sx={{
                        minWidth: 150,
                        marginLeft: 1,
                    }} size="small" variant="standard">
                        <InputLabel>Version</InputLabel>
                        <Select
                            id={`${command.id}-version-select`}
                            value={command.selectedVersion}
                            onChange={(event) => {
                                onSelectCommandVersion(command.names, event.target.value);
                            }}
                            size="small"
                        >
                            {command.versions!.map((version) => (
                                <MenuItem value={version.name} key={`${command.id}-version-select-${version.name}`}>
                                    <SelectionTypography>{version.name}</SelectionTypography>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl sx={{
                        minWidth: 150,
                        marginLeft: 1,
                    }} size="small" variant="standard">
                        <InputLabel>Command table</InputLabel>
                        <Select
                            id={`${command.id}-register-select`}
                            value={command.registered ? 1 : 0}
                            onChange={(event) => {
                                onSelectCommandRegistered(command.names, event.target.value === 1);
                            }}
                            size="small"
                        >
                            <MenuItem value={1} key={`${command.id}-register-select-registered`}>
                                <RegisteredTypography>Registered</RegisteredTypography>
                            </MenuItem>
                            <MenuItem value={0} key={`${command.id}-register-select-unregistered`}>
                                <UnregisteredTypography>Unregistered</UnregisteredTypography>
                            </MenuItem>
                        </Select>
                    </FormControl>
                </Box>}
                {command.loading === true && command.selected && <Box sx={{
                    marginLeft: 1,
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-start"
                }}>
                    <Typography variant="body2" color="textSecondary">Loading...</Typography>
                </Box>}
            </Box>}
            onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
            }}
        />
    );
};

interface CommandGroupItemProps {
    commandGroup: ProfileCTCommandGroup,
    onSelectCommandGroup: (names: string[], selected: boolean) => void,
    onToggleCommandGroupExpanded: (cnames: string[]) => void,
    onSelectCommand: (names: string[], selected: boolean) => void,
    onSelectCommandVersion: (names: string[], version: string) => void,
    onSelectCommandRegistered: (names: string[], registered: boolean) => void,
}

const CommandGroupItem: React.FC<CommandGroupItemProps> = ({
    commandGroup,
    onSelectCommandGroup,
    onToggleCommandGroupExpanded,
    onSelectCommand,
    onSelectCommandVersion,
    onSelectCommandRegistered,
}) => {
    const nodeName = commandGroup.names[commandGroup.names.length - 1];
    const selected = commandGroup.selected ?? false;
    return (
        <TreeItem sx={{ marginLeft: 2, marginTop: 0.5 }} key={commandGroup.id} nodeId={commandGroup.id} color='inherit' label={
            <Box sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-start",
            }}>
                <Checkbox
                    disableRipple
                    checked={commandGroup.selected !== false}
                    indeterminate={commandGroup.selected === undefined}
                    onClick={(event) => {
                        onSelectCommandGroup(commandGroup.names, !selected);
                        event.stopPropagation();
                        event.preventDefault();
                    }}
                />
                <FolderIcon />
                <CommandGroupTypography sx={{ marginLeft: 1 }}>{nodeName}</CommandGroupTypography>
            </Box>}
            onClick={(event) => {
                onToggleCommandGroupExpanded(commandGroup.names);
                event.stopPropagation();
                event.preventDefault();
            }}
        >
            {commandGroup.commands !== undefined && Object.values(commandGroup.commands).map((command) => (
                <CommandItem
                    key={command.id}
                    command={command}
                    onSelectCommand={onSelectCommand}
                    onSelectCommandVersion={onSelectCommandVersion}
                    onSelectCommandRegistered={onSelectCommandRegistered}
                />
            ))}
            {commandGroup.commandGroups !== undefined && Object.values(commandGroup.commandGroups).map((group) => (
                <CommandGroupItem
                    key={group.id}
                    commandGroup={group}
                    onSelectCommandGroup={onSelectCommandGroup}
                    onToggleCommandGroupExpanded={onToggleCommandGroupExpanded}
                    onSelectCommand={onSelectCommand}
                    onSelectCommandVersion={onSelectCommandVersion}
                    onSelectCommandRegistered={onSelectCommandRegistered}
                />
            ))}
            {commandGroup.loading === true && <LoadingItem name={nodeName} />}
        </TreeItem>
    );
};

const LoadingItem: React.FC<{ name: string }> = ({ name }) => {
    return (<TreeItem sx={{ marginLeft: 2 }} nodeId="loading" color='inherit' label={<Box sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
    }}>
        <Typography>
            Loading {name}...
        </Typography>
    </Box>} />)
}

interface CLIModGeneratorProfileCommandTreeProps {
    profileCommandTree: ProfileCommandTree,
    onChange: (updater: ((newProfileCommandTree: ProfileCommandTree) => ProfileCommandTree) | ProfileCommandTree) => void,
    onLoadCommandGroup: (names: string[]) => Promise<CLISpecsCommandGroup>,
    onLoadCommand: (names: string[]) => Promise<CLISpecsCommand>,
}

const CLIModGeneratorProfileCommandTree: React.FC<CLIModGeneratorProfileCommandTreeProps> = ({
    profileCommandTree,
    onChange,
    onLoadCommandGroup,
    onLoadCommand,
}) => {
    const [expanded, setExpanded] = React.useState<string[]>([]);
    console.log("Rerender using ProfileCommandTree: ", profileCommandTree);
    console.log("Rerender using Expanded State: ", expanded);

    React.useEffect(() => {
        setExpanded(GetDefaultExpanded(profileCommandTree));
    }, []);

    const onSelectCommandGroup =  (names: string[], selected: boolean) => {
        onChange((profileCommandTree) => {
            const newTree = updateProfileCommandTree(profileCommandTree, names, selected)
            return genericUpdateCommandGroup(newTree, names, (commandGroup) => {
                return loadAllNextLevel(commandGroup, onLoadCommand, onLoadCommandGroup, onLoadedCommand, onLoadedCommandGroup);
            }) ?? newTree;
        });
    };

    const onSelectCommand = (names: string[], selected: boolean) => {
        onChange((profileCommandTree) => {
            const newTree = updateProfileCommandTree(profileCommandTree, names, selected);
            return genericUpdateCommand(newTree, names, (command) => loadCommand(command, onLoadCommand, onLoadedCommand)) ?? newTree;
        });
    };

    const onSelectCommandVersion = (names: string[], version: string) => {
        onChange((profileCommandTree) => updateProfileCommandTree(profileCommandTree, names, true, version));
    };

    const onSelectCommandRegistered = (names: string[], registered: boolean) => {
        onChange((profileCommandTree) => updateProfileCommandTree(profileCommandTree, names, true, undefined, registered));
    };

    const onLoadedCommandGroup = React.useCallback((commandGroup: CLISpecsCommandGroup) => {
        const names = commandGroup.names;
        onChange((profileCommandTree) => {
            return genericUpdateCommandGroup(profileCommandTree, names, (unloadedCommandGroup) => {
                const newCommandGroup = decodeProfileCTCommandGroup(commandGroup, unloadedCommandGroup.selected)
                if (newCommandGroup.selected) {
                    return loadAllNextLevel(newCommandGroup, onLoadCommand, onLoadCommandGroup, onLoadedCommand, onLoadedCommandGroup);
                }
                return newCommandGroup
            })!;
        });
    }, [onChange]);

    const onLoadedCommand = React.useCallback((command: CLISpecsCommand) => {
        const names = command.names;
        onChange((profileCommandTree) => {
            return genericUpdateCommand(profileCommandTree, names, (unloadedCommand) => {
                return decodeProfileCTCommand(command, unloadedCommand.selected, unloadedCommand.modified);
            })!;
        });
    }, [onChange]);

    const onToggleCommandGroupExpanded = (names: string[]) => {
        console.log("onToggleCommandGroupExpanded", names);
        const commandGroup = findCommandGroup(profileCommandTree, names);
        setExpanded((prev) => {
            console.log("Change Expaned of ", commandGroup);
            console.log("Prev Expanded", prev);
            if (prev.includes(commandGroup!.id)) {
                return prev.filter((value) => value !== commandGroup!.id);
            } else {
                return [...prev, commandGroup!.id];
            }
        });
    
        if (!expanded.includes(commandGroup!.id)) {
            onChange((profileCommandTree) => 
                genericUpdateCommandGroup(profileCommandTree, names, (commandGroup) => {
                    return loadCommandGroup(commandGroup, onLoadCommandGroup, onLoadedCommandGroup);
                }) ?? profileCommandTree
            );
        }
    };
    

    return (
        <React.Fragment>
            <TreeView
                disableSelection={true}
                expanded={expanded}
                defaultCollapseIcon={<ArrowDropDownIcon />}
                defaultExpandIcon={<ArrowRightIcon />}
            >
                {Object.values(profileCommandTree.commandGroups).map((commandGroup) => (
                    <CommandGroupItem
                        key={commandGroup.id}
                        commandGroup={commandGroup}
                        onSelectCommandGroup={onSelectCommandGroup}
                        onToggleCommandGroupExpanded={onToggleCommandGroupExpanded}
                        onSelectCommand={onSelectCommand}
                        onSelectCommandVersion={onSelectCommandVersion}
                        onSelectCommandRegistered={onSelectCommandRegistered}
                    />
                ))}
            </TreeView>
        </React.Fragment>
    );
};

interface ProfileCommandTree {
    name: string;
    commandGroups: ProfileCTCommandGroups;
};

interface ProfileCTCommandGroups {
    [name: string]: ProfileCTCommandGroup;
}

interface ProfileCTCommands {
    [name: string]: ProfileCTCommand;
}

interface ProfileCTCommandGroup {
    id: string;
    names: string[];
    help: string;

    commandGroups?: ProfileCTCommandGroups;
    commands?: ProfileCTCommands;
    waitCommand?: CLIModViewCommand;

    loading: boolean;
    selected?: boolean;
};

function isUnloadedCommandGroup(commandGroup: ProfileCTCommandGroup): boolean {
    return commandGroup.commands === undefined && commandGroup.loading === false;
}

interface ProfileCTCommand {
    id: string;
    names: string[];
    help: string;

    versions?: ProfileCTCommandVersion[];

    selectedVersion?: string;
    registered?: boolean;
    modified: boolean;

    loading: boolean;
    selected: boolean;
};

function isUnloadedCommand(command: ProfileCTCommand): boolean {
    return command.selectedVersion === undefined && command.loading === false;
}

interface ProfileCTCommandVersion {
    name: string;
    stage: string;
};

function decodeProfileCTCommandVersion(response: any): ProfileCTCommandVersion {
    return {
        name: response.name,
        stage: response.stage,
    }
}


function decodeProfileCTCommand(response: CLISpecsCommand, selected: boolean = false, modified: boolean = false): ProfileCTCommand {
    const versions = response.versions?.map((value: any) => decodeProfileCTCommandVersion(value));
    const command = {
        id: response.names.join('/'),
        names: [...response.names],
        help: response.help.short,
        versions: versions,
        modified: modified,
        loading: false,
        selected: selected,
    }
    if (selected) {
        const selectedVersion = versions ? versions[0].name : undefined;
        return {
            ...command,
            selectedVersion: selectedVersion,
        }
    } else {
        return command;
    }
}

function decodeProfileCTCommandGroup(response: CLISpecsCommandGroup, selected: boolean = false): ProfileCTCommandGroup {
    const commands = response.commands !== undefined ? Object.fromEntries(
        Object.entries(response.commands).map(([name, command]) => [name, decodeProfileCTCommand(command, selected, selected)])
    ) : undefined;
    const commandGroups = response.commandGroups !== undefined ? Object.fromEntries(
        Object.entries(response.commandGroups).map(([name, group]) => [name, decodeProfileCTCommandGroup(group, selected)])
    ) : undefined;
    return {
        id: response.names.join('/'),
        names: [...response.names],
        help: response.help?.short ?? '',
        commandGroups: commandGroups,
        commands: commands,
        loading: false,
        selected: selected,
    }
}

function BuildProfileCommandTree(profileName: string, response: CLISpecsCommandGroup): ProfileCommandTree {
    const commandGroups = response.commandGroups !== undefined ? Object.fromEntries(
        Object.entries(response.commandGroups).map(([name, group]) => [name, decodeProfileCTCommandGroup(group)])
    ) : {};
    return {
        name: profileName,
        commandGroups: commandGroups,
    }
}

function getDefaultExpandedOfCommandGroup(commandGroup: ProfileCTCommandGroup): string[] {
    let expandedIds = commandGroup.commandGroups ? Object.values(commandGroup.commandGroups).flatMap(value => value.selected !== false ? [value.id, ...getDefaultExpandedOfCommandGroup(value)] : []) : [];
    return expandedIds;
}

function GetDefaultExpanded(tree: ProfileCommandTree): string[] {
    return Object.values(tree.commandGroups).flatMap(value => {
        let ids = getDefaultExpandedOfCommandGroup(value);
        if (value.selected !== false) {
            ids.push(value.id);
        }
        return ids;
    });
}

function findCommandGroup(tree: ProfileCommandTree, names: string[]): ProfileCTCommandGroup | undefined {
    if (names.length === 0) {
        return undefined;
    }
    let cg: ProfileCTCommandGroup | ProfileCommandTree = tree;
    for (const name of names) {
        if (cg.commandGroups === undefined) {
            return undefined;
        }
        cg = cg.commandGroups[name];
    }
    return cg as ProfileCTCommandGroup;
}

function findCommand(tree: ProfileCommandTree, names: string[]): ProfileCTCommand | undefined {
    if (names.length === 0) {
        return undefined;
    }
    let cg: ProfileCTCommandGroup | ProfileCommandTree = tree;
    for (const name of names.slice(0, -1)) {
        if (cg.commandGroups === undefined) {
            return undefined;
        }
        cg = cg.commandGroups[name] as ProfileCTCommandGroup;
    }
    cg = cg as ProfileCTCommandGroup;
    if (cg.commands === undefined) {
        return undefined;
    }
    return cg.commands[names[names.length - 1]];
}

function loadCommand(command: ProfileCTCommand, fetchCommand: (names: string[]) => Promise<CLISpecsCommand>, onLoadedCommand: (command: CLISpecsCommand) => void): ProfileCTCommand | undefined {
    if (isUnloadedCommand(command)) {
        fetchCommand(command.names).then(onLoadedCommand);
        return { ...command, loading: true };
    } else {
        return undefined;
    }
}

function loadCommandGroup(commandGroup: ProfileCTCommandGroup, fetchCommandGroup: (names: string[]) => Promise<CLISpecsCommandGroup>, onLoadedCommandGroup: (commandGroup: CLISpecsCommandGroup) => void): ProfileCTCommandGroup | undefined {
    if (isUnloadedCommandGroup(commandGroup)) {
        fetchCommandGroup(commandGroup.names).then(onLoadedCommandGroup);
        return { ...commandGroup, loading: true };
    } else {
        return undefined;
    }
}

function loadAllNextLevel(commandGroup: ProfileCTCommandGroup, fetchCommand: (names: string[]) => Promise<CLISpecsCommand>, fetchCommandGroup: (names: string[]) => Promise<CLISpecsCommandGroup>, onLoadedCommand: (command: CLISpecsCommand) => void, onLoadedCommandGroup: (commandGroup: CLISpecsCommandGroup) => void): ProfileCTCommandGroup {
    if (isUnloadedCommandGroup(commandGroup)) {
        fetchCommandGroup(commandGroup.names).then(onLoadedCommandGroup);
        return { ...commandGroup, loading: true };
    } else {
        const commandGroups = commandGroup.commandGroups ? Object.fromEntries(Object.entries(commandGroup.commandGroups).map(([name, group]) => [name, loadAllNextLevel(group, fetchCommand, fetchCommandGroup, onLoadedCommand, onLoadedCommandGroup)])) : undefined;
        const commands = commandGroup.commands ? Object.fromEntries(Object.entries(commandGroup.commands).map(([name, command]) => [name, loadCommand(command, fetchCommand, onLoadedCommand) ?? command])) : undefined;
        return { ...commandGroup, commandGroups: commandGroups, commands: commands };
    }
}

function genericUpdateCommand(tree: ProfileCommandTree, names: string[], updater: (command: ProfileCTCommand) => ProfileCTCommand | undefined): ProfileCommandTree | undefined {
    let nodes: ProfileCTCommandGroup[] = [];
    for (const name of names.slice(0, -1)) {
        const node = nodes.length === 0 ? tree : nodes[nodes.length - 1];
        if (node.commandGroups === undefined) {
            throw new Error("Invalid names: " + names.join(' '));
        }
        nodes.push(node.commandGroups[name]);
    }
    let currentCommandGroup = nodes[nodes.length - 1];
    const updatedCommand = updater(currentCommandGroup.commands![names[names.length - 1]]);
    if (updatedCommand === undefined) {
        return undefined;
    }
    const commands = {
        ...currentCommandGroup.commands,
        [names[names.length - 1]]: updatedCommand,
    };
    const groupSelected = calculateSelected(commands, currentCommandGroup.commandGroups!);
    currentCommandGroup = {
        ...currentCommandGroup,
        commands: commands,
        selected: groupSelected,
    };
    for (const node of nodes.reverse().slice(1)) {
        const commandGroups = {
            ...node.commandGroups,
            [currentCommandGroup.names[currentCommandGroup.names.length - 1]]: currentCommandGroup,
        }
        const selected = calculateSelected(node.commands ?? {}, commandGroups);
        currentCommandGroup = {
            ...node,
            commandGroups: commandGroups,
            selected: selected,
        }
    }
    return {
        ...tree,
        commandGroups: {
            ...tree.commandGroups,
            [currentCommandGroup.names[currentCommandGroup.names.length - 1]]: currentCommandGroup,
        }
    }
}

function genericUpdateCommandGroup(tree: ProfileCommandTree, names: string[], updater: (commandGroup: ProfileCTCommandGroup) => ProfileCTCommandGroup | undefined): ProfileCommandTree | undefined {
    let nodes: ProfileCTCommandGroup[] = [];
    for (const name of names) {
        const node = nodes.length === 0 ? tree : nodes[nodes.length - 1];
        if (node.commandGroups === undefined) {
            throw new Error("Invalid names: " + names.join(' '));
        }
        nodes.push(node.commandGroups[name]);
    }
    let currentCommandGroup = nodes[nodes.length - 1];
    const updatedCommandGroup = updater(currentCommandGroup);
    if (updatedCommandGroup === undefined) {
        return undefined;
    }
    currentCommandGroup = updatedCommandGroup;
    for (const node of nodes.reverse().slice(1)) {
        const commandGroups = {
            ...node.commandGroups,
            [currentCommandGroup.names[currentCommandGroup.names.length - 1]]: currentCommandGroup,
        }
        const selected = calculateSelected(node.commands ?? {}, commandGroups);
        currentCommandGroup = {
            ...node,
            commandGroups: commandGroups,
            selected: selected,
        }
    }
    return {
        ...tree,
        commandGroups: {
            ...tree.commandGroups,
            [currentCommandGroup.names[currentCommandGroup.names.length - 1]]: currentCommandGroup,
        }
    }
}

function calculateSelected(commands: ProfileCTCommands, commandGroups: ProfileCTCommandGroups): boolean | undefined {
    const commandsAllSelected = Object.values(commands).reduce((pre, value) => { return pre && value.selected }, true);
    const commandsAllUnselected = Object.values(commands).reduce((pre, value) => { return pre && !value.selected }, true);
    const commandGroupsAllSelected = Object.values(commandGroups).reduce((pre, value) => { return pre && value.selected === true }, true);
    const commandGroupsAllUnselected = Object.values(commandGroups).reduce((pre, value) => { return pre && value.selected === false }, true);
    if (commandsAllUnselected && commandGroupsAllUnselected) {
        return false;
    } else if (commandsAllSelected && commandGroupsAllSelected) {
        return true;
    } else {
        return undefined;
    }
}

function updateCommand(command: ProfileCTCommand, selected: boolean, version: string | undefined, registered: boolean | undefined): ProfileCTCommand {
    if (selected) {
        return {
            ...command,
            selectedVersion: version ?? command.selectedVersion ?? (command.versions !== undefined ? command.versions[0].name : undefined),
            registered: registered ?? command.registered ?? true,
            selected: true,
            modified: true,
        }
    } else {
        return {
            ...command,
            selectedVersion: undefined,
            registered: undefined,
            selected: false,
            modified: true,
        }
    }
}

function updateCommandGroup(commandGroup: ProfileCTCommandGroup, names: string[], selected: boolean, version: string | undefined, registered: boolean | undefined): ProfileCTCommandGroup {
    if (names.length === 0) {
        const commands = commandGroup.commands ? Object.fromEntries(Object.entries(commandGroup.commands).map(([key, command]) => [key, updateCommand(command, selected, version, registered)])) : undefined;
        const commandGroups = commandGroup.commandGroups ? Object.fromEntries(Object.entries(commandGroup.commandGroups).map(([key, commandGroup]) => [key, updateCommandGroup(commandGroup, [], selected, version, registered)])) : undefined;
        const groupSelected = commands !== undefined && commandGroups !== undefined ? calculateSelected(commands, commandGroups): selected;
        return {
            ...commandGroup,
            commands: commands,
            commandGroups: commandGroups,
            selected: groupSelected,
        }
    } else {
        let name = names[0];
        if (name in (commandGroup.commandGroups ?? {})) {
            let subGroup = commandGroup.commandGroups![name];
            const commandGroups = {
                ...commandGroup.commandGroups,
                [name]: updateCommandGroup(subGroup, names.slice(1), selected, version, registered),
            }
            const commands = commandGroup.commands;
            const groupSelected = calculateSelected(commands ?? {}, commandGroups);
            return {
                ...commandGroup,
                commandGroups: commandGroups,
                selected: groupSelected,
            }
        } else if (name in (commandGroup.commands ?? {}) && names.length === 1) {
            let command = commandGroup.commands![name];
            const commands = {
                ...commandGroup.commands,
                [name]: updateCommand(command, selected, version, registered),
            }
            const commandGroups = commandGroup.commandGroups;
            const groupSelected = calculateSelected(commands, commandGroups ?? {});
            return {
                ...commandGroup,
                commands: commands,
                selected: groupSelected,
            }
        } else {
            throw new Error("Invalid names: " + names.join(' '));
        }
    }
    
}

function updateProfileCommandTree(tree: ProfileCommandTree, names: string[], selected: boolean, version: string | undefined = undefined, registered: boolean | undefined = undefined): ProfileCommandTree {
    const name = names[0];
    const commandGroup = tree.commandGroups[name];
    const commandGroups = {
        ...tree.commandGroups,
        [name]: updateCommandGroup(commandGroup, names.slice(1), selected, version, registered),
    }
    return {
        ...tree,
        commandGroups: commandGroups
    }
}

function updateCommandByModView(command: ProfileCTCommand, view: CLIModViewCommand): ProfileCTCommand {
    if (command.id !== view.names.join('/')) {
        throw new Error("Invalid command names: " + view.names.join(' '))
    }
    return {
        ...command,
        selectedVersion: view.version,
        registered: view.registered,
        selected: view.version !== undefined,
    }
}

function updateCommandGroupByModView(commandGroup: ProfileCTCommandGroup, view: CLIModViewCommandGroup): ProfileCTCommandGroup {
    if (commandGroup.id !== view.names.join('/')) {
        throw new Error("Invalid command group names: " + view.names.join(' '))
    }
    let commands = commandGroup.commands;
    if (view.commands !== undefined) {
        let keys = new Set(Object.keys(view.commands));
        commands = commandGroup.commands ? Object.fromEntries(Object.entries(commandGroup.commands).map(([key, value]) => {
            if (keys.has(key)) {
                keys.delete(key);
                return [key, updateCommandByModView(value, view.commands![key])];
            } else {
                return [key, value];
            }
        })) : undefined;
        if (keys.size > 0) {
            let commandNames: string[] = [];
            keys.forEach(key => {
                commandNames.push('`az ' + view.commands![key].names.join(" ") + '`')
            })
            throw new Error("Miss commands in aaz: " + commandNames.join(', '))
        }
    }

    let commandGroups = commandGroup.commandGroups;
    if (view.commandGroups !== undefined) {
        let keys = new Set(Object.keys(view.commandGroups));
        commandGroups = commandGroup.commandGroups ? Object.fromEntries(Object.entries(commandGroup.commandGroups).map(([key, subCg]) => {
            if (keys.has(key)) {
                keys.delete(key);
                return [key, updateCommandGroupByModView(subCg, view.commandGroups![subCg.names[subCg.names.length - 1]])];
            } else {
                return [key, subCg];
            }
        })) : undefined;
        if (keys.size > 0) {
            let commandGroupNames: string[] = [];
            keys.forEach(key => {
                commandGroupNames.push('`az ' + view.commandGroups![key].names.join(" ") + '`')
            })
            throw new Error("Miss command groups in aaz: " + commandGroupNames.join(', '))
        }
    }

    return {
        ...commandGroup,
        commands: commands,
        commandGroups: commandGroups,
        waitCommand: view.waitCommand,
        selected: calculateSelected(commands ?? {}, commandGroups ?? {}),
    }
}

function UpdateProfileCommandTreeByModView(tree: ProfileCommandTree, view: CLIModViewProfile): ProfileCommandTree {
    let commandGroups = tree.commandGroups;
    if (view.commandGroups !== undefined) {
        let keys = new Set(Object.keys(view.commandGroups));
        commandGroups = Object.fromEntries(Object.entries(tree.commandGroups).map(([key, value]) => {
            if (keys.has(key)) {
                keys.delete(key);
                return [key, updateCommandGroupByModView(value, view.commandGroups![value.names[value.names.length - 1]])];
            } else {
                return [key, value];
            }
        }));
        if (keys.size > 0) {
            let commandGroupNames: string[] = [];
            keys.forEach(key => {
                commandGroupNames.push('`az ' + view.commandGroups![key].names.join(" ") + '`')
            })
            throw new Error("Miss command groups in aaz: " + commandGroupNames.join(', '))
        }
    }

    return {
        ...tree,
        commandGroups: commandGroups
    }
}

async function initializeCommandGroupByModView(view: CLIModViewCommandGroup, fetchCommandGroup: (names: string[]) => Promise<CLISpecsCommandGroup>, fetchCommand: (names: string[]) => Promise<CLISpecsCommand>): Promise<ProfileCTCommandGroup> {
    let commandGroupPromise = fetchCommandGroup(view.names).then((value) => {return decodeProfileCTCommandGroup(value)});
    let viewSubGroupsPromise = Promise.all(Object.keys(view.commandGroups ?? {}).map(async (key) => {
        return initializeCommandGroupByModView(view.commandGroups![key], fetchCommandGroup, fetchCommand);
    }));
    let viewCommandsPromise = Promise.all(Object.keys(view.commands ?? {}).map(async (key) => {
        return updateCommandByModView(await fetchCommand(view.commands![key].names).then((value) => decodeProfileCTCommand(value)), view.commands![key]);
    }));
    let commandGroup = await commandGroupPromise;
    let viewSubGroups = await viewSubGroupsPromise;
    let subGroups = Object.fromEntries(Object.entries(commandGroup.commandGroups ?? {}).map(([key, value]) => {
        let group = viewSubGroups.find((v) => v.id === value.id);
        if (group !== undefined) {
            return [key, group];
        } else {
            return [key, value];
        }
    }));
    let viewCommands = await viewCommandsPromise;
    let commands = Object.fromEntries(Object.entries(commandGroup.commands ?? {}).map(([key, value]) => {
        let command = viewCommands.find((v) => v.id === value.id);
        if (command !== undefined) {
            return [key, command];
        } else {
            return [key, value];
        }
    }));
    return {
        ...(await commandGroupPromise),
        commandGroups: subGroups,
        commands: commands,
    }
}

async function InitializeCommandTreeByModView(profileName: string, view: CLIModViewProfile|null, fetchCommandGroup: (names: string[]) => Promise<CLISpecsCommandGroup>, fetchCommand: (names: string[]) => Promise<CLISpecsCommand>): Promise<ProfileCommandTree> {
    let ctPromise = fetchCommandGroup([]).then((value) => {return BuildProfileCommandTree(profileName, value)});
    if (view && view.commandGroups !== undefined) {
        let commandGroupsOnView = await Promise.all(Object.keys(view.commandGroups).map(async (key) => {
            const value = await initializeCommandGroupByModView(view.commandGroups![key], fetchCommandGroup, fetchCommand);
            return value;
        }));
        let commandTree = await ctPromise;
        let commandGroups = Object.fromEntries(Object.entries(commandTree.commandGroups).map(([key, value]) => {
            let group = commandGroupsOnView.find((v) => v.id === value.id);
            if (group !== undefined) {
                return [key, group];
            } else {
                return [key, value];
            }
        }));
        commandTree = {
            ...commandTree,
            commandGroups: commandGroups ?? {},
        }
        return UpdateProfileCommandTreeByModView(commandTree, view);
    } else {
        return await ctPromise;
    }
}

function ExportModViewCommand(command: ProfileCTCommand): CLIModViewCommand | undefined {
    if (command.selectedVersion === undefined) {
        return undefined
    }

    return {
        names: command.names,
        registered: command.registered!,
        version: command.selectedVersion!,
        modified: command.modified,
    }
}

function ExportModViewCommandGroup(commandGroup: ProfileCTCommandGroup): CLIModViewCommandGroup | undefined {
    if (commandGroup.selected === false) {
        return undefined
    }

    let commands: CLIModViewCommands | undefined = undefined;
    if (commandGroup.commands !== undefined) {
        commands = {}

        Object.values(commandGroup.commands!).forEach(value => {
            let view = ExportModViewCommand(value);
            if (view !== undefined) {
                commands![value.names[value.names.length - 1]] = view;
            }
        })
    }

    let commandGroups: CLIModViewCommandGroups | undefined = undefined;
    if (commandGroup.commandGroups !== undefined) {
        commandGroups = {}

        Object.values(commandGroup.commandGroups!).forEach(value => {
            let view = ExportModViewCommandGroup(value);
            if (view !== undefined) {
                commandGroups![value.names[value.names.length - 1]] = view;
            }
        })
    }
    return {
        names: commandGroup.names,
        commandGroups: commandGroups,
        commands: commands,
        waitCommand: commandGroup.waitCommand,
    }
}


function ExportModViewProfile(tree: ProfileCommandTree): CLIModViewProfile {
    let commandGroups: CLIModViewCommandGroups = {};

    Object.values(tree.commandGroups).forEach(value => {
        let view = ExportModViewCommandGroup(value);
        if (view !== undefined) {
            commandGroups[value.names[value.names.length - 1]] = view;
        }
    })

    return {
        name: tree.name,
        commandGroups: commandGroups
    }
}

export default CLIModGeneratorProfileCommandTree;

export type { ProfileCommandTree, }

export { InitializeCommandTreeByModView, BuildProfileCommandTree, UpdateProfileCommandTreeByModView, ExportModViewProfile }