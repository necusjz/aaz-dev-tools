import os
import unittest

from command.controller.command_tree import CMDSpecsPartialCommand, CMDSpecsPartialCommandGroup, \
    CMDSpecsPartialCommandTree, to_limited_primitive, build_simple_command_tree
from command.model.configuration import CMDHelp

COMMAND_INFO = """# [Command] _vm deallocate_

Deallocate a VM so that computing resources are no longer allocated (charges no longer apply). The status will change from 'Stopped' to 'Stopped (Deallocated)'.

For an end-to-end tutorial, see https://docs.microsoft.com/azure/virtual-machines/linux/capture-image

## Versions

### [2017-03-30](/Resources/mgmt-plane/L3N1YnNjcmlwdGlvbnMve30vcmVzb3VyY2Vncm91cHMve30vcHJvdmlkZXJzL21pY3Jvc29mdC5jb21wdXRlL3ZpcnR1YWxtYWNoaW5lcy97fS9kZWFsbG9jYXRl/2017-03-30.xml) **Stable**

<!-- mgmt-plane /subscriptions/{}/resourcegroups/{}/providers/microsoft.compute/virtualmachines/{}/deallocate 2017-03-30 -->

#### examples

- Deallocate, generalize, and capture a stopped virtual machine.
    ```bash
        vm deallocate -g MyResourceGroup -n MyVm
        vm generalize -g MyResourceGroup -n MyVm
        vm capture -g MyResourceGroup -n MyVm --vhd-name-prefix MyPrefix
    ```

- Deallocate, generalize, and capture multiple stopped virtual machines.
    ```bash
        vm deallocate --ids vms_ids
        vm generalize --ids vms_ids
        vm capture --ids vms_ids --vhd-name-prefix MyPrefix
    ```

- Deallocate a VM.
    ```bash
        vm deallocate --name MyVm --no-wait --resource-group MyResourceGroup
    ```

### [2017-12-01](/Resources/mgmt-plane/L3N1YnNjcmlwdGlvbnMve30vcmVzb3VyY2Vncm91cHMve30vcHJvdmlkZXJzL21pY3Jvc29mdC5jb21wdXRlL3ZpcnR1YWxtYWNoaW5lcy97fS9kZWFsbG9jYXRl/2017-12-01.xml) **Stable**

<!-- mgmt-plane /subscriptions/{}/resourcegroups/{}/providers/microsoft.compute/virtualmachines/{}/deallocate 2017-12-01 -->

#### examples

- Deallocate, generalize, and capture a stopped virtual machine.
    ```bash
        vm deallocate -g MyResourceGroup -n MyVm
        vm generalize -g MyResourceGroup -n MyVm
        vm capture -g MyResourceGroup -n MyVm --vhd-name-prefix MyPrefix
    ```

- Deallocate, generalize, and capture multiple stopped virtual machines.
    ```bash
        vm deallocate --ids vms_ids
        vm generalize --ids vms_ids
        vm capture --ids vms_ids --vhd-name-prefix MyPrefix
    ```

- Deallocate a VM.
    ```bash
        vm deallocate --name MyVm --no-wait --resource-group MyResourceGroup
    ```

### [2020-06-01](/Resources/mgmt-plane/L3N1YnNjcmlwdGlvbnMve30vcmVzb3VyY2Vncm91cHMve30vcHJvdmlkZXJzL21pY3Jvc29mdC5jb21wdXRlL3ZpcnR1YWxtYWNoaW5lcy97fS9kZWFsbG9jYXRl/2020-06-01.xml) **Stable**

<!-- mgmt-plane /subscriptions/{}/resourcegroups/{}/providers/microsoft.compute/virtualmachines/{}/deallocate 2020-06-01 -->

#### examples

- Deallocate, generalize, and capture a stopped virtual machine.
    ```bash
        vm deallocate -g MyResourceGroup -n MyVm
        vm generalize -g MyResourceGroup -n MyVm
        vm capture -g MyResourceGroup -n MyVm --vhd-name-prefix MyPrefix
    ```

- Deallocate, generalize, and capture multiple stopped virtual machines.
    ```bash
        vm deallocate --ids vms_ids
        vm generalize --ids vms_ids
        vm capture --ids vms_ids --vhd-name-prefix MyPrefix
    ```

- Deallocate a VM.
    ```bash
        vm deallocate --name MyVm --no-wait --resource-group MyResourceGroup
    ```

### [2022-11-01](/Resources/mgmt-plane/L3N1YnNjcmlwdGlvbnMve30vcmVzb3VyY2Vncm91cHMve30vcHJvdmlkZXJzL21pY3Jvc29mdC5jb21wdXRlL3ZpcnR1YWxtYWNoaW5lcy97fS9kZWFsbG9jYXRl/2022-11-01.xml) **Stable**

<!-- mgmt-plane /subscriptions/{}/resourcegroups/{}/providers/microsoft.compute/virtualmachines/{}/deallocate 2022-11-01 -->

#### examples

- Deallocate, generalize, and capture a stopped virtual machine.
    ```bash
        vm deallocate -g MyResourceGroup -n MyVm
        vm generalize -g MyResourceGroup -n MyVm
        vm capture -g MyResourceGroup -n MyVm --vhd-name-prefix MyPrefix
    ```

- Deallocate, generalize, and capture multiple stopped virtual machines.
    ```bash
        vm deallocate --ids vms_ids
        vm generalize --ids vms_ids
        vm capture --ids vms_ids --vhd-name-prefix MyPrefix
    ```

- Deallocate a VM.
    ```bash
        vm deallocate --name MyVm --no-wait --resource-group MyResourceGroup
    ```
"""

GROUP_INFO = """# [Group] _voice-service_

Manage voice services

## Subgroups

- [gateway](/Commands/voice-service/gateway/readme.md)
: Manage communications gateway

- [test-line](/Commands/voice-service/test-line/readme.md)
: Manage gateway test line

## Commands

- [check-name-availability](/Commands/voice-service/_check-name-availability.md)
: Check whether the resource name is available in the given region.
"""

ROOT_INFO = """# Atomic Azure CLI Commands

## Groups

- [acat](/Commands/acat/readme.md)
: ACAT command group

- [account](/Commands/account/readme.md)
: Manage Azure subscription information.

- [afd](/Commands/afd/readme.md)
: Manage Azure Front Door Standard/Premium.

- [alerts-management](/Commands/alerts-management/readme.md)
: Manage Azure Alerts Management Service Resource.

- [amlfs](/Commands/amlfs/readme.md)
: Manage lustre file system

- [aosm](/Commands/aosm/readme.md)
: Manage Azure Operator Service Manager resources.

- [apic](/Commands/apic/readme.md)
: Manage Azure API Center services

- [arc](/Commands/arc/readme.md)
: Manage Azure Arc Machines.

- [astronomer](/Commands/astronomer/readme.md)
: Manage Azure Astronomer resources.

- [attestation](/Commands/attestation/readme.md)
: Manage Microsoft Azure Attestation (MAA).

- [automanage](/Commands/automanage/readme.md)
: Manage Automanage

- [automation](/Commands/automation/readme.md)
: Manage Automation Account.

- [billing](/Commands/billing/readme.md)
: Manage Azure Billing.

- [billing-benefits](/Commands/billing-benefits/readme.md)
: Azure billing benefits commands

- [blueprint](/Commands/blueprint/readme.md)
: Commands to manage blueprint.

- [cache](/Commands/cache/readme.md)
: Azure Cache for Redis

- [capacity](/Commands/capacity/readme.md)
: Manage capacity.

- [cdn](/Commands/cdn/readme.md)
: Manage Azure Content Delivery Networks (CDNs).

- [change-analysis](/Commands/change-analysis/readme.md)
: List changes for resources

- [cloud-service](/Commands/cloud-service/readme.md)
: Manage cloud service

- [communication](/Commands/communication/readme.md)
: Manage communication service with communication.

- [compute](/Commands/compute/readme.md)
: Mange azure compute vm config

- [compute-diagnostic](/Commands/compute-diagnostic/readme.md)
: Mange vm sku recommender info

- [compute-recommender](/Commands/compute-recommender/readme.md)
: Manage sku/zone/region recommender info for compute resources

- [confidentialledger](/Commands/confidentialledger/readme.md)
: Deploy and manage Azure confidential ledgers.

- [confluent](/Commands/confluent/readme.md)
: Manage confluent organization

- [connectedmachine](/Commands/connectedmachine/readme.md)
: Manage Azure Arc-Enabled Server.

- [consumption](/Commands/consumption/readme.md)
: Manage consumption of Azure resources.
"""


class CommandTreeTest(unittest.TestCase):
    def test_load_command(self):
        command = CMDSpecsPartialCommand.parse_command_info(COMMAND_INFO, ["vm", "deallocate"])
        self.assertEqual(command.names, ["vm", "deallocate"])
        self.assertEqual(command.help.short, "Deallocate a VM so that computing resources are no longer allocated (charges no longer apply). The status will change from 'Stopped' to 'Stopped (Deallocated)'.")
        self.assertListEqual(command.help.lines, [
            "For an end-to-end tutorial, see https://docs.microsoft.com/azure/virtual-machines/linux/capture-image"
        ])
        self.assertEqual(len(command.versions), 4)
        self.assertEqual(command.versions[0].name, "2017-03-30")
        self.assertEqual(command.versions[0].stage, None)   # Hidden when stable
        self.assertEqual(len(command.versions[0].resources), 1)
        self.assertEqual(command.versions[0].resources[0].plane, "mgmt-plane")
        self.assertEqual(command.versions[0].resources[0].id, "/subscriptions/{}/resourcegroups/{}/providers/microsoft.compute/virtualmachines/{}/deallocate")
        self.assertEqual(command.versions[0].resources[0].version, "2017-03-30")
        self.assertEqual(command.versions[0].resources[0].subresource, None)
        self.assertEqual(len(command.versions[0].examples), 3)
        self.assertEqual(command.versions[0].examples[0].name, "Deallocate, generalize, and capture a stopped virtual machine.")
        self.assertListEqual(command.versions[0].examples[0].commands, [
            "vm deallocate -g MyResourceGroup -n MyVm",
            "vm generalize -g MyResourceGroup -n MyVm",
            "vm capture -g MyResourceGroup -n MyVm --vhd-name-prefix MyPrefix"
        ])
        command.validate()

    @unittest.skipIf(os.getenv("AAZ_FOLDER") is None, "No AAZ_FOLDER environment variable set")
    def test_load_command_group(self):
        aaz_folder = os.getenv("AAZ_FOLDER")
        group = CMDSpecsPartialCommandGroup.parse_command_group_info(GROUP_INFO, ["voice-service"], aaz_folder)
        self.assertIsInstance(group.command_groups.get_raw_item('gateway'), CMDSpecsPartialCommandGroup)
        self.assertEqual(group.names, ["voice-service"])
        self.assertEqual(group.help.short, "Manage voice services")
        self.assertEqual(group.help.lines, None)
        self.assertEqual(len(group.command_groups), 2)
        self.assertEqual(group.command_groups["gateway"].names, ["voice-service", "gateway"])
        self.assertEqual(group.command_groups["gateway"].help.short, "Manage communications gateway")
        self.assertEqual(group.command_groups["test-line"].names, ["voice-service", "test-line"])
        self.assertEqual(group.command_groups["test-line"].help.short, "Manage gateway test line")
        self.assertEqual(len(group.commands), 1)
        self.assertEqual(group.commands["check-name-availability"].names, ["voice-service", "check-name-availability"])
        self.assertEqual(group.commands["check-name-availability"].help.short, "Check whether the resource name is available in the given region.")
        group.validate()

    @unittest.skipIf(os.getenv("AAZ_FOLDER") is None, "No AAZ_FOLDER environment variable set")
    def test_load_command_tree_from_disk(self):
        aaz_folder = os.getenv("AAZ_FOLDER")
        command_tree = CMDSpecsPartialCommandTree(aaz_folder)
        self.assertIsNotNone(command_tree.root)
        self.assertEqual(len(command_tree.root.commands), 0)
        self.assertNotEqual(len(command_tree.root.command_groups), 0)
        command_tree.iter_commands()
        command_tree.to_model().validate()
        command_tree_json = command_tree.to_model().to_primitive()
        aaz_tree_path = os.path.join(aaz_folder, 'Commands', 'tree.json')
        with open(aaz_tree_path, 'r', encoding='utf-8') as f:
            import json
            aaz_tree = json.load(f)
        # command_tree_json_str = json.dumps(command_tree_json, sort_keys=True)
        # aaz_tree_str = json.dumps(aaz_tree, sort_keys=True)
        # with open(os.path.join(aaz_folder, 'Commands', 'tmp_tree.json'), 'w') as f:
        #     json.dump(command_tree_json, f, indent=2, sort_keys=True)
        print("Dumped Command Tree String Len: " + str(len(json.dumps(command_tree_json, sort_keys=True))))
        print("Dumped AAZ Tree String Len: " + str(len(json.dumps(aaz_tree, sort_keys=True))))
        # self.assertEqual(command_tree_json_str, aaz_tree_str)

    @unittest.skipIf(os.getenv("AAZ_FOLDER") is None, "No AAZ_FOLDER environment variable set")
    def test_patch(self):
        aaz_folder = os.getenv("AAZ_FOLDER")
        command_tree = CMDSpecsPartialCommandTree(aaz_folder)
        cg = command_tree.create_command_group('fake_cg')
        cg.help = CMDHelp()
        cg.help.short = 'HELP'
        command = command_tree.create_command('fake_cg', 'fake_new_command')
        command.help = CMDHelp()
        command.help.short = 'HELP'
        for version in command_tree.find_command('acat', 'report', 'snapshot', 'download').versions:
            command_tree.delete_command_version('acat', 'report', 'snapshot', 'download', version=version.name)
        command_tree.delete_command('acat', 'report', 'snapshot', 'download')

        command_tree.patch()
        self.assertNotIn('download', command_tree.find_command_group('acat', 'report', 'snapshot').commands)
        self.assertIn('fake_new_command', command_tree.find_command_group('fake_cg').commands)

    @unittest.skipIf(os.getenv("AAZ_FOLDER") is None, "No AAZ_FOLDER environment variable set")
    def test_partial_command_group_to_primitive(self):
        aaz_folder = os.getenv("AAZ_FOLDER")
        command_tree = CMDSpecsPartialCommandTree(aaz_folder)
        cg = command_tree.find_command_group('acat')
        self.assertIsInstance(cg.command_groups.get_raw_item('report'), CMDSpecsPartialCommandGroup)
        primitive = to_limited_primitive(cg)
        self.assertListEqual(primitive['names'], cg.names)
        self.assertEqual(primitive['help']['short'], cg.help.short)
        self.assertIsInstance(cg.command_groups.get_raw_item('report'), CMDSpecsPartialCommandGroup)

    @unittest.skipIf(os.getenv("AAZ_FOLDER") is None, "No AAZ_FOLDER environment variable set")
    def test_simple_command_tree(self):
        aaz_folder = os.getenv("AAZ_FOLDER")
        simple_tree = build_simple_command_tree(aaz_folder)
        print()
